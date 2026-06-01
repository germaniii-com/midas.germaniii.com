import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { accounts } from '../db/schema';

interface CreateAccountBody {
  name: string;
  type: string;
}

interface UpdateAccountBody {
  name?: string;
  type?: string;
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
      return reply.send(accountList);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateAccountBody }>(
    '/binders/:id/accounts/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name, type } = req.body;

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

      return reply.status(201).send(account);
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

      return reply.send(account);
    },
  );

  app.put<{ Params: { id: string; accountId: string }; Body: UpdateAccountBody }>(
    '/binders/:id/accounts/:accountId',
    async (req, reply) => {
      const { id, accountId } = req.params;
      const { name, type } = req.body;

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
              eq(accounts.id, accountId),
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

      return reply.send(account);
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
