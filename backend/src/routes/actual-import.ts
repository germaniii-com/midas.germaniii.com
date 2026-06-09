import { FastifyInstance } from 'fastify';
import type { Multipart } from '@fastify/multipart';
import crypto from 'node:crypto';
import initSqlJs from 'sql.js';
import { eq, sql } from 'drizzle-orm';
import { db, pool } from '../db';
import { budgetBinders } from '../db/schema';

function getFieldValue(field: Multipart | Multipart[] | undefined): string {
  if (!field) return '';
  if (Array.isArray(field)) return getFieldValue(field[0]);
  if (field.type === 'field') return String(field.value ?? '');
  return '';
}

function fmt(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val)}'`;
}

function buildInsert(table: string, columns: string[], rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const values = rows
    .map((row) => `(${columns.map((c) => fmt(row[c])).join(', ')})`)
    .join(',\n');
  return `INSERT INTO ${table} (${cols}) VALUES\n${values};\n`;
}

function dateFromYyyyMmDd(d: number): string {
  const s = String(d);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function getPayeeName(payees: Record<string, unknown>[], payeeId: string): string | null {
  const payee = payees.find((p) => p.id === payeeId);
  return payee ? (payee.name as string) || null : null;
}

function toRows(result: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function actualImportRoutes(app: FastifyInstance) {
  app.post('/binders/import-actual', async (req, reply) => {
    const user = (req as any).user as { id: string };
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    const nameOverride = getFieldValue(data.fields.name).trim();
    const currencyOverride = getFieldValue(data.fields.currency).trim();

    const SQL = await initSqlJs();
    const sqliteDb = new SQL.Database(new Uint8Array(fileBuffer));

    const [accountsRes, payeesRes, payeeMappingRes, categoriesRes, categoryGroupsRes,
           categoryMappingRes, transactionsRes, notesRes] = [
      sqliteDb.exec('SELECT * FROM accounts WHERE tombstone = 0 AND closed = 0'),
      sqliteDb.exec('SELECT * FROM payees WHERE tombstone = 0'),
      sqliteDb.exec('SELECT * FROM payee_mapping'),
      sqliteDb.exec('SELECT * FROM categories WHERE tombstone = 0'),
      sqliteDb.exec('SELECT * FROM category_groups WHERE tombstone = 0'),
      sqliteDb.exec('SELECT * FROM category_mapping'),
      sqliteDb.exec('SELECT * FROM transactions WHERE tombstone = 0'),
      sqliteDb.exec('SELECT * FROM notes'),
    ];

    sqliteDb.close();

    const accounts = toRows(accountsRes);
    const payees = toRows(payeesRes);
    const payeeMappingRows = toRows(payeeMappingRes);
    const categories = toRows(categoriesRes);
    const categoryGroups = toRows(categoryGroupsRes);
    const categoryMappingRows = toRows(categoryMappingRes);
    const allTransactions = toRows(transactionsRes);
    const noteRows = toRows(notesRes);

    const payeeMapping = new Map<string, string>();
    for (const pm of payeeMappingRows) {
      payeeMapping.set(pm.id as string, pm.targetId as string);
    }

    const categoryMapping = new Map<string, string>();
    for (const cm of categoryMappingRows) {
      categoryMapping.set(cm.id as string, cm.transferId as string);
    }

    const transferPayeeIds = new Set<string>();
    for (const p of payees) {
      const ta = p.transfer_acct;
      if (ta && String(ta).trim()) {
        transferPayeeIds.add(p.id as string);
      }
    }

    const notesMap = new Map<string, string>();
    for (const n of noteRows) {
      const content = n.note as string;
      if (content && content.trim()) {
        const m = String(n.id).match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
        );
        if (m) notesMap.set(m[0], content);
      }
    }

    const budgetName = nameOverride || 'Imported from Actual Budget';

    const [existing] = await db
      .select({ id: budgetBinders.id })
      .from(budgetBinders)
      .where(sql`LOWER(${budgetBinders.name}) = LOWER(${budgetName})`)
      .limit(1);

    const finalName = existing ? `${budgetName} (Imported)` : budgetName;
    const newBinderId = crypto.randomUUID();
    const newCurrency = currencyOverride || 'USD';

    const accountIdMap = new Map<string, string>();
    for (const a of accounts) {
      accountIdMap.set(a.id as string, crypto.randomUUID());
    }

    const categoryIdMap = new Map<string, string>();
    const categoryToTagIdMap = new Map<string, string>();
    for (const c of categories) {
      const catId = crypto.randomUUID();
      categoryIdMap.set(c.id as string, catId);
      categoryToTagIdMap.set(c.id as string, crypto.randomUUID());
    }

    const nonTransferPayees = payees.filter(
      (p) => !transferPayeeIds.has(p.id as string),
    );
    const payeeIdMap = new Map<string, string>();
    for (const p of nonTransferPayees) {
      payeeIdMap.set(p.id as string, crypto.randomUUID());
    }

    const transactions = allTransactions.filter(
      (tx) => !tx.isChild,
    );
    const transactionIdMap = new Map<string, string>();
    for (const tx of transactions) {
      transactionIdMap.set(tx.id as string, crypto.randomUUID());
    }

    const lines: string[] = [];
    lines.push('BEGIN;');
    lines.push('');

    lines.push(
      `INSERT INTO budget_binders (id, user_id, name, description, currency, created_at)`,
    );
    lines.push(
      `VALUES (${fmt(newBinderId)}, ${fmt(user.id)}, ${fmt(finalName)}, NULL, ${fmt(newCurrency)}, NOW());`,
    );
    lines.push('');

    if (accounts.length > 0) {
      const accountRows = accounts.map((a) => ({
        id: accountIdMap.get(a.id as string),
        binder_id: newBinderId,
        name: a.name as string,
        type: 'checking',
      }));
      const insert = buildInsert('accounts', ['id', 'binder_id', 'name', 'type'], accountRows);
      if (insert) lines.push(insert);
    }

    if (categories.length > 0) {
      const catRows = categories.map((c) => ({
        id: categoryIdMap.get(c.id as string),
        binder_id: newBinderId,
        name: c.name as string,
      }));
      const insert = buildInsert('categories', ['id', 'binder_id', 'name'], catRows);
      if (insert) lines.push(insert);
    }

    if (categories.length > 0) {
      const tagRows = categories.map((c) => ({
        id: categoryToTagIdMap.get(c.id as string),
        binder_id: newBinderId,
        name: c.name as string,
      }));
      const insert = buildInsert('tags', ['id', 'binder_id', 'name'], tagRows);
      if (insert) lines.push(insert);
    }

    if (nonTransferPayees.length > 0) {
      const payeeRows = nonTransferPayees.map((p) => ({
        id: payeeIdMap.get(p.id as string),
        binder_id: newBinderId,
        name: p.name as string,
      }));
      const insert = buildInsert('payees', ['id', 'binder_id', 'name'], payeeRows);
      if (insert) lines.push(insert);
    }

    const insertedTxIds = new Set<string>();

    if (transactions.length > 0) {
      const txRows: Record<string, unknown>[] = [];
      const transferPairs: { txId: string; transferredId: string }[] = [];

      for (const tx of transactions) {
        const resolvedPayeeId = payeeMapping.get(tx.description as string) || (tx.description as string);
        const isTransfer = transferPayeeIds.has(resolvedPayeeId);
        const oldTxId = tx.id as string;
        const newTxId = transactionIdMap.get(oldTxId);
        if (!newTxId) continue;

        const newAccountId = accountIdMap.get(tx.acct as string);
        if (!newAccountId) continue;

        let newPayeeId: string | null = null;
        if (!isTransfer) {
          newPayeeId = payeeIdMap.get(resolvedPayeeId) || null;
        }

        if (isTransfer && tx.transferred_id) {
          const counterpartNewId = transactionIdMap.get(String(tx.transferred_id));
          if (counterpartNewId) {
            transferPairs.push({ txId: newTxId, transferredId: String(tx.transferred_id) });
          }
        }

        const amount = centsToDecimal(Number(tx.amount));
        const date = dateFromYyyyMmDd(Number(tx.date));

        const abNotes = String(tx.notes || '').trim();
        let notes: string | null = abNotes;
        if (!abNotes) {
          const payeeName = getPayeeName(payees, resolvedPayeeId);
          if (payeeName) notes = payeeName;
        }
        if (notes !== null && !notes.trim()) notes = null;

        const isCleared = true;

        insertedTxIds.add(newTxId);
        txRows.push({
          id: newTxId,
          binder_id: newBinderId,
          account_id: newAccountId,
          payee_id: newPayeeId,
          amount,
          date,
          notes,
          is_cleared: isCleared,
        });
      }

      const insert = buildInsert(
        'transactions',
        ['id', 'binder_id', 'account_id', 'payee_id', 'amount', 'date', 'notes', 'is_cleared'],
        txRows,
      );
      if (insert) lines.push(insert);

      for (const pair of transferPairs) {
        const counterpartId = transactionIdMap.get(pair.transferredId);
        if (counterpartId && insertedTxIds.has(counterpartId)) {
          lines.push(
            `UPDATE transactions SET transfer_id = ${fmt(counterpartId)} WHERE id = ${fmt(pair.txId)};`,
          );
          lines.push(
            `UPDATE transactions SET transfer_id = ${fmt(pair.txId)} WHERE id = ${fmt(counterpartId)};`,
          );
        }
      }
    }

    if (insertedTxIds.size > 0) {
      const ttRows: Record<string, unknown>[] = [];
      for (const tx of transactions) {
        const cat = tx.category;
        if (cat && String(cat).trim()) {
          const newTxId = transactionIdMap.get(tx.id as string);
          if (!newTxId || !insertedTxIds.has(newTxId)) continue;
          const resolvedCatId = categoryMapping.get(String(cat)) || String(cat);
          const tagId = categoryToTagIdMap.get(resolvedCatId);
          if (tagId) {
            ttRows.push({
              binder_id: newBinderId,
              transaction_id: newTxId,
              tag_id: tagId,
            });
          }
        }
      }
      const insert = buildInsert('transaction_tags', ['binder_id', 'transaction_id', 'tag_id'], ttRows);
      if (insert) lines.push(insert);
    }

    lines.push('COMMIT;');

    const fullSql = lines.join('\n');

    try {
      await pool.query(fullSql);
    } catch (err: unknown) {
      await db.delete(budgetBinders).where(eq(budgetBinders.id, newBinderId)).catch(() => {});
      const message = err instanceof Error ? err.message : 'Import failed';
      console.error('=== ACTUAL IMPORT ERROR ===', err);
      return reply.status(400).send({ error: message });
    }

    return reply.status(201).send({
      id: newBinderId,
      name: finalName,
      description: 'Imported from Actual Budget',
      currency: newCurrency,
    });
  });
}
