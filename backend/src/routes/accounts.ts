import { FastifyInstance } from 'fastify';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { accounts, categories, accountCategories } from '../db/schema';

interface CreateAccountBody {
  name: string;
  type: string;
  categoryIds?: string[];
}

interface UpdateAccountBody {
  name?: string;
  type?: string;
  categoryIds?: string[];
}

export async function accountRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/binders/:id/accounts',
    async (req, reply) => {
      const accountList = await db
        .select({
          id: accounts.id,
          binderId: accounts.binderId,
          name: accounts.name,
          type: accounts.type,
          createdAt: accounts.createdAt,
          balance:
            sql<string>`COALESCE((SELECT SUM(amount) FROM transactions WHERE transactions.account_id = accounts.id), 0)`,
        })
        .from(accounts)
        .where(eq(accounts.binderId, req.params.id))
        .orderBy(accounts.name);

      if (accountList.length === 0) return reply.send([]);

      const accountIds = accountList.map((a) => a.id);
      const categoryRows = await db
        .select({
          accountId: accountCategories.accountId,
          id: categories.id,
          name: categories.name,
        })
        .from(accountCategories)
        .innerJoin(categories, eq(accountCategories.categoryId, categories.id))
        .where(inArray(accountCategories.accountId, accountIds));

      const categoriesByAccountId: Record<string, { id: string; name: string }[]> = {};
      for (const cr of categoryRows) {
        if (!categoriesByAccountId[cr.accountId]) categoriesByAccountId[cr.accountId] = [];
        categoriesByAccountId[cr.accountId].push({ id: cr.id, name: cr.name });
      }

      const result = accountList.map((a) => ({
        ...a,
        categories: categoriesByAccountId[a.id] || [],
      }));

      return reply.send(result);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateAccountBody }>(
    '/binders/:id/accounts/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name, type, categoryIds } = req.body;

      if (!name?.trim()) {
        return reply.status(400).send({ error: 'Name is required' });
      }
      if (!type?.trim()) {
        return reply.status(400).send({ error: 'Type is required' });
      }

      const [existing] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.binderId, id),
            sql`LOWER(${accounts.name}) = LOWER(${name.trim()})`,
          ),
        )
        .limit(1);

      if (existing) {
        return reply
          .status(409)
          .send({ error: 'An account with this name already exists in this binder' });
      }

      const [account] = await db
        .insert(accounts)
        .values({
          binderId: id,
          name: name.trim(),
          type,
        })
        .returning();

      if (categoryIds && categoryIds.length > 0) {
        await db.insert(accountCategories).values(
          categoryIds.map((categoryId) => ({
            binderId: id,
            accountId: account.id,
            categoryId,
          })),
        );
      }

      const categoryList = categoryIds && categoryIds.length > 0
        ? await db
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(inArray(categories.id, categoryIds))
        : [];

      return reply.status(201).send({ ...account, categories: categoryList });
    },
  );

  app.get<{ Params: { id: string; accountId: string } }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, req.params.accountId),
            eq(accounts.binderId, req.params.id),
          ),
        );

      if (!account) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      const categoryList = await db
        .select({ id: categories.id, name: categories.name })
        .from(accountCategories)
        .innerJoin(categories, eq(accountCategories.categoryId, categories.id))
        .where(eq(accountCategories.accountId, account.id));

      return reply.send({ ...account, categories: categoryList });
    },
  );

  app.put<{ Params: { id: string; accountId: string }; Body: UpdateAccountBody }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const { id, accountId } = req.params;
      const { name, type, categoryIds } = req.body;

      if (name !== undefined && !name.trim()) {
        return reply.status(400).send({ error: 'Name cannot be empty' });
      }

      if (name !== undefined) {
        const [existing] = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(
            and(
              eq(accounts.binderId, id),
              sql`LOWER(${accounts.name}) = LOWER(${name.trim()})`,
              sql`${accounts.id} != ${accountId}`,
            ),
          )
          .limit(1);

        if (existing) {
          return reply
            .status(409)
            .send({ error: 'An account with this name already exists in this binder' });
        }
      }

      const updates: Partial<typeof accounts.$inferInsert> = {};
      if (name !== undefined) updates.name = name.trim();
      if (type !== undefined) updates.type = type;

      const [account] = await db
        .update(accounts)
        .set(updates)
        .where(eq(accounts.id, accountId))
        .returning();

      if (!account) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      if (categoryIds !== undefined) {
        await db
          .delete(accountCategories)
          .where(eq(accountCategories.accountId, accountId));

        if (categoryIds.length > 0) {
          await db.insert(accountCategories).values(
            categoryIds.map((categoryId) => ({
              binderId: id,
              accountId,
              categoryId,
            })),
          );
        }
      }

      const categoryList = categoryIds && categoryIds.length > 0
        ? await db
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(inArray(categories.id, categoryIds))
        : [];

      return reply.send({ ...account, categories: categoryList });
    },
  );

  app.delete<{ Params: { id: string; accountId: string } }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const [account] = await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.id, req.params.accountId),
            eq(accounts.binderId, req.params.id),
          ),
        )
        .returning({ id: accounts.id });

      if (!account) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      return reply.status(204).send();
    },
  );
}
