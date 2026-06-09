import { FastifyInstance } from 'fastify';
import { eq, and, sql, inArray, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { transactions, accounts, payees, tags, transactionTags, accountCategories, transactionAttachments } from '../db/schema';
import { deleteFile } from '../minio';

interface CreateTransactionBody {
  accountId: string;
  amount: string;
  date: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

interface UpdateTransactionBody {
  accountId?: string;
  amount?: string;
  date?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

function flipAmount(amount: string): string {
  return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
}

export async function transactionRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string }; Querystring: { accountId?: string; categoryId?: string } }>(
    '/binders/:id/transactions',
    async (req, reply) => {
      const { id } = req.params;
      const { accountId, categoryId } = req.query;

      const filters = [eq(transactions.binderId, id)];
      if (accountId) filters.push(eq(transactions.accountId, accountId));
      if (categoryId) {
        const catAccountRows = await db
          .select({ accountId: accountCategories.accountId })
          .from(accountCategories)
          .where(eq(accountCategories.categoryId, categoryId));
        if (catAccountRows.length === 0) return reply.send([]);
        filters.push(inArray(transactions.accountId, catAccountRows.map((r) => r.accountId)));
      }

      const counterpartTx = alias(transactions, 'counterpart_tx');
      const transferAccount = alias(accounts, 'transfer_account');

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
          transferId: transactions.transferId,
          transferAccountId: counterpartTx.accountId,
          transferAccountName: transferAccount.name,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(payees, eq(transactions.payeeId, payees.id))
        .leftJoin(counterpartTx, eq(transactions.transferId, counterpartTx.id))
        .leftJoin(transferAccount, eq(counterpartTx.accountId, transferAccount.id))
        .where(and(...filters))
        .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);

      if (rows.length === 0) return reply.send([]);

      const txIds = rows.map((r) => r.id);

      const attachmentCountRows = await db
        .select({
          transactionId: transactionAttachments.transactionId,
          count: count(),
        })
        .from(transactionAttachments)
        .where(inArray(transactionAttachments.transactionId, txIds))
        .groupBy(transactionAttachments.transactionId);

      const attachmentCountByTxId: Record<string, number> = {};
      for (const acr of attachmentCountRows) {
        attachmentCountByTxId[acr.transactionId] = acr.count;
      }

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
        attachmentCount: attachmentCountByTxId[r.id] || 0,
      }));

      return reply.send(result);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateTransactionBody }>(
    '/binders/:id/transactions/create',
    async (req, reply) => {
      const { id } = req.params;
      const { accountId, amount, date, payeeId, transferAccountId, notes, isCleared, tagIds } = req.body;

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
          transferId: null,
          notes: notes ?? null,
          isCleared: isCleared ?? true,
        })
        .returning();

      if (transferAccountId) {
        const counterpartAmount = flipAmount(amount);
        const [counterpart] = await db
          .insert(transactions)
          .values({
            binderId: id,
            accountId: transferAccountId,
            amount: counterpartAmount,
            date,
            payeeId: null,
            transferId: tx.id,
            isCleared: isCleared ?? true,
          })
          .returning();

        await db
          .update(transactions)
          .set({ transferId: counterpart.id })
          .where(eq(transactions.id, tx.id));

        tx.transferId = counterpart.id;
      }

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

      const counterpartTx = alias(transactions, 'counterpart_tx');
      const transferAccount = alias(accounts, 'transfer_account');

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
          transferId: transactions.transferId,
          transferAccountId: counterpartTx.accountId,
          transferAccountName: transferAccount.name,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(payees, eq(transactions.payeeId, payees.id))
        .leftJoin(counterpartTx, eq(transactions.transferId, counterpartTx.id))
        .leftJoin(transferAccount, eq(counterpartTx.accountId, transferAccount.id))
        .where(and(eq(transactions.id, transactionId), eq(transactions.binderId, id)));

      if (!tx) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      const tagList = await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(eq(transactionTags.transactionId, transactionId));

      const attachmentList = await db
        .select({
          id: transactionAttachments.id,
          fileName: transactionAttachments.fileName,
          mimeType: transactionAttachments.mimeType,
          fileSize: transactionAttachments.fileSize,
          createdAt: transactionAttachments.createdAt,
        })
        .from(transactionAttachments)
        .where(eq(transactionAttachments.transactionId, transactionId))
        .orderBy(transactionAttachments.createdAt);

      return reply.send({ ...tx, tags: tagList, attachments: attachmentList });
    },
  );

  app.put<{ Params: { id: string; transactionId: string }; Body: UpdateTransactionBody }>(
    '/binders/:id/transactions/:transactionId',
    async (req, reply) => {
      const { id, transactionId } = req.params;
      const { accountId, amount, date, payeeId, transferAccountId, notes, isCleared, tagIds } = req.body;

      const [oldTx] = await db
        .select({
          id: transactions.id,
          transferId: transactions.transferId,
          amount: transactions.amount,
          date: transactions.date,
          isCleared: transactions.isCleared,
        })
        .from(transactions)
        .where(eq(transactions.id, transactionId))
        .limit(1);

      if (!oldTx) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      const updates: Partial<typeof transactions.$inferInsert> = {};
      if (accountId !== undefined) updates.accountId = accountId;
      if (amount !== undefined) updates.amount = amount;
      if (date !== undefined) updates.date = date;
      if (payeeId !== undefined) updates.payeeId = payeeId;
      if (notes !== undefined) updates.notes = notes;
      if (isCleared !== undefined) updates.isCleared = isCleared;

      const hadTransfer = oldTx.transferId !== null;
      const wantsTransfer = transferAccountId !== undefined && transferAccountId !== null;

      if (hadTransfer && !wantsTransfer) {
        await db
          .delete(transactionTags)
          .where(eq(transactionTags.transactionId, oldTx.transferId!));
        await db
          .delete(transactions)
          .where(eq(transactions.id, oldTx.transferId!));
        updates.transferId = null;
      } else if (wantsTransfer && !hadTransfer) {
        const counterpartAmount = flipAmount(amount ?? oldTx.amount);
        const [counterpart] = await db
          .insert(transactions)
          .values({
            binderId: id,
            accountId: transferAccountId,
            amount: counterpartAmount,
            date: date ?? oldTx.date,
            payeeId: null,
            transferId: null,
            isCleared: isCleared ?? true,
          })
          .returning();
        updates.transferId = counterpart.id;
      } else if (hadTransfer && wantsTransfer) {
        const [counterpart] = await db
          .select({ accountId: transactions.accountId })
          .from(transactions)
          .where(eq(transactions.id, oldTx.transferId!))
          .limit(1);

        if (counterpart && counterpart.accountId !== transferAccountId) {
          await db
            .delete(transactionTags)
            .where(eq(transactionTags.transactionId, oldTx.transferId!));
          await db
            .delete(transactions)
            .where(eq(transactions.id, oldTx.transferId!));

          const counterpartAmount = flipAmount(amount ?? oldTx.amount);
          const [newCounterpart] = await db
            .insert(transactions)
            .values({
              binderId: id,
              accountId: transferAccountId,
              amount: counterpartAmount,
              date: date ?? oldTx.date,
              payeeId: null,
              transferId: null,
              isCleared: isCleared ?? true,
            })
            .returning();
          updates.transferId = newCounterpart.id;
        } else {
          const counterpartUpdates: Partial<typeof transactions.$inferInsert> = {};
          if (amount !== undefined) counterpartUpdates.amount = flipAmount(amount);
          if (date !== undefined) counterpartUpdates.date = date;
          if (isCleared !== undefined) counterpartUpdates.isCleared = isCleared;

          if (Object.keys(counterpartUpdates).length > 0) {
            await db
              .update(transactions)
              .set(counterpartUpdates)
              .where(eq(transactions.id, oldTx.transferId!));
          }
        }
      }

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

      const [existing] = await db
        .select({ transferId: transactions.transferId })
        .from(transactions)
        .where(and(eq(transactions.id, transactionId), eq(transactions.binderId, id)))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: 'Transaction not found' });
      }

      const txIdsToDelete = [transactionId];
      if (existing.transferId) {
        txIdsToDelete.push(existing.transferId);
      }

      const attachmentRows = await db
        .select({ objectName: transactionAttachments.objectName })
        .from(transactionAttachments)
        .where(inArray(transactionAttachments.transactionId, txIdsToDelete));

      for (const att of attachmentRows) {
        await deleteFile(att.objectName).catch(() => {});
      }

      await db
        .delete(transactionTags)
        .where(inArray(transactionTags.transactionId, txIdsToDelete));

      await db
        .delete(transactionAttachments)
        .where(inArray(transactionAttachments.transactionId, txIdsToDelete));

      await db
        .delete(transactions)
        .where(inArray(transactions.id, txIdsToDelete));

      return reply.status(204).send();
    },
  );
}
