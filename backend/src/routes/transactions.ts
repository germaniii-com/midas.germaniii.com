import { FastifyInstance } from 'fastify';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { transactions, accounts, payees, tags, transactionTags } from '../db/schema';

interface CreateTransactionBody {
  accountId: string;
  amount: string;
  date: string;
  payeeId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

interface UpdateTransactionBody {
  accountId?: string;
  amount?: string;
  date?: string;
  payeeId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/binders/:id/transactions',
    async (req, reply) => {
      const { id } = req.params;

      const rows = await db
        .select({
          id: transactions.id,
          binderId: transactions.binderId,
          accountId: transactions.accountId,
          accountName: accounts.name,
          payeeId: transactions.payeeId,
          payeeName: payees.name,
          amount: transactions.amount,
          date: transactions.date,
          notes: transactions.notes,
          isCleared: transactions.isCleared,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(payees, eq(transactions.payeeId, payees.id))
        .where(eq(transactions.binderId, id))
        .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);

      if (rows.length === 0) return reply.send([]);

      const txIds = rows.map((r) => r.id);
      const tagRows = await db
        .select({
          transactionId: transactionTags.transactionId,
          id: tags.id,
          name: tags.name,
          color: tags.color,
        })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(inArray(transactionTags.transactionId, txIds));

      const tagsByTxId: Record<string, { id: string; name: string; color: string | null }[]> = {};
      for (const tr of tagRows) {
        if (!tagsByTxId[tr.transactionId]) tagsByTxId[tr.transactionId] = [];
        tagsByTxId[tr.transactionId].push({ id: tr.id, name: tr.name, color: tr.color });
      }

      const result = rows.map((r) => ({
        ...r,
        tags: tagsByTxId[r.id] || [],
      }));

      return reply.send(result);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateTransactionBody }>(
    '/binders/:id/transactions/create',
    async (req, reply) => {
      const { id } = req.params;
      const { accountId, amount, date, payeeId, notes, isCleared, tagIds } = req.body;

      if (!accountId) {
        return reply.status(400).send({ error: 'Account is required' });
      }
      if (amount === undefined || amount === null) {
        return reply.status(400).send({ error: 'Amount is required' });
      }
      if (!date) {
        return reply.status(400).send({ error: 'Date is required' });
      }

      const [tx] = await db
        .insert(transactions)
        .values({
          binderId: id,
          accountId,
          amount,
          date,
          payeeId: payeeId ?? null,
          notes: notes ?? null,
          isCleared: isCleared ?? true,
        })
        .returning();

      if (tagIds && tagIds.length > 0) {
        await db.insert(transactionTags).values(
          tagIds.map((tagId) => ({
            binderId: id,
            transactionId: tx.id,
            tagId,
          })),
        );
      }

      const tagList = tagIds && tagIds.length > 0
        ? await db
            .select({ id: tags.id, name: tags.name, color: tags.color })
            .from(tags)
            .where(inArray(tags.id, tagIds))
        : [];

      return reply.status(201).send({ ...tx, tags: tagList });
    },
  );

  app.get<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;

      const [tx] = await db
        .select({
          id: transactions.id,
          binderId: transactions.binderId,
          accountId: transactions.accountId,
          accountName: accounts.name,
          payeeId: transactions.payeeId,
          payeeName: payees.name,
          amount: transactions.amount,
          date: transactions.date,
          notes: transactions.notes,
          isCleared: transactions.isCleared,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(payees, eq(transactions.payeeId, payees.id))
        .where(and(eq(transactions.id, transactionId), eq(transactions.binderId, id)));

      if (!tx) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      const tagList = await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(eq(transactionTags.transactionId, transactionId));

      return reply.send({ ...tx, tags: tagList });
    },
  );

  app.put<{ Params: { id: string; transactionId: string }; Body: UpdateTransactionBody }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;
      const { accountId, amount, date, payeeId, notes, isCleared, tagIds } = req.body;

      const updates: Partial<typeof transactions.$inferInsert> = {};
      if (accountId !== undefined) updates.accountId = accountId;
      if (amount !== undefined) updates.amount = amount;
      if (date !== undefined) updates.date = date;
      if (payeeId !== undefined) updates.payeeId = payeeId;
      if (notes !== undefined) updates.notes = notes;
      if (isCleared !== undefined) updates.isCleared = isCleared;

      const [tx] = await db
        .update(transactions)
        .set(updates)
        .where(eq(transactions.id, transactionId))
        .returning();

      if (!tx) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      if (tagIds !== undefined) {
        await db
          .delete(transactionTags)
          .where(eq(transactionTags.transactionId, transactionId));

        if (tagIds.length > 0) {
          await db.insert(transactionTags).values(
            tagIds.map((tagId) => ({
              binderId: id,
              transactionId,
              tagId,
            })),
          );
        }
      }

      const tagList = tagIds && tagIds.length > 0
        ? await db
            .select({ id: tags.id, name: tags.name, color: tags.color })
            .from(tags)
            .where(inArray(tags.id, tagIds))
        : [];

      return reply.send({ ...tx, tags: tagList });
    },
  );

  app.delete<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;

      await db
        .delete(transactionTags)
        .where(eq(transactionTags.transactionId, transactionId));

      const [tx] = await db
        .delete(transactions)
        .where(and(eq(transactions.id, transactionId), eq(transactions.binderId, id)))
        .returning({ id: transactions.id });

      if (!tx) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      return reply.status(204).send();
    },
  );
}
