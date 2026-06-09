import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { budgetBinders } from '../db/schema';
import { authenticate, verifyBinderOwnership } from '../middleware/auth';

interface CreateBinderBody {
  name: string;
  description?: string;
  currency?: string;
}

interface UpdateBinderBody {
  name?: string;
  currency?: string;
}

export async function binderRoutes(app: FastifyInstance) {
  app.get(
    '/binders',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = (req as any).user as { id: string };
      const binders = await db
        .select({
          id: budgetBinders.id,
          name: budgetBinders.name,
          description: budgetBinders.description,
          currency: budgetBinders.currency,
        })
        .from(budgetBinders)
        .where(eq(budgetBinders.userId, user.id))
        .orderBy(budgetBinders.createdAt);
      return reply.send(binders);
    },
  );

  app.post<{ Body: CreateBinderBody }>(
    '/binders',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = (req as any).user as { id: string };
      const { name, description, currency } = req.body;

      const [existing] = await db
        .select({ id: budgetBinders.id })
        .from(budgetBinders)
        .where(sql`LOWER(${budgetBinders.name}) = LOWER(${name.trim()})`)
        .limit(1);
      if (existing) {
        return reply
          .status(409)
          .send({ error: 'A binder with this name already exists' });
      }

      const [binder] = await db
        .insert(budgetBinders)
        .values({
          userId: user.id,
          name: name.trim(),
          description: description ?? null,
          currency: currency ?? 'USD',
        })
        .returning({
          id: budgetBinders.id,
          name: budgetBinders.name,
          description: budgetBinders.description,
          currency: budgetBinders.currency,
        });
      return reply.status(201).send(binder);
    },
  );

  app.get<{ Params: { id: string } }>(
    '/binders/:id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = (req as any).user as { id: string };
      try {
        await verifyBinderOwnership(req.params.id, user.id);
      } catch {
        return reply.status(404).send({ error: 'Binder not found' });
      }

      const [binder] = await db
        .select({
          id: budgetBinders.id,
          name: budgetBinders.name,
          description: budgetBinders.description,
          currency: budgetBinders.currency,
        })
        .from(budgetBinders)
        .where(eq(budgetBinders.id, req.params.id));
      return reply.send(binder);
    },
  );

  app.put<{ Params: { id: string }; Body: UpdateBinderBody }>(
    '/binders/:id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const user = (req as any).user as { id: string };
      try {
        await verifyBinderOwnership(req.params.id, user.id);
      } catch {
        return reply.status(404).send({ error: 'Binder not found' });
      }

      const { name, currency } = req.body;
      const updates: Partial<typeof budgetBinders.$inferInsert> = {};

      if (name !== undefined) {
        if (!name.trim()) {
          return reply.status(400).send({ error: 'Name cannot be empty' });
        }
        const [existing] = await db
          .select({ id: budgetBinders.id })
          .from(budgetBinders)
          .where(
            and(
              sql`LOWER(${budgetBinders.name}) = LOWER(${name.trim()})`,
              sql`${budgetBinders.id} != ${req.params.id}`,
            ),
          )
          .limit(1);
        if (existing) {
          return reply
            .status(409)
            .send({ error: 'A binder with this name already exists' });
        }
        updates.name = name.trim();
      }

      if (currency !== undefined) {
        updates.currency = currency;
      }

      const [binder] = await db
        .update(budgetBinders)
        .set(updates)
        .where(eq(budgetBinders.id, req.params.id))
        .returning({
          id: budgetBinders.id,
          name: budgetBinders.name,
          description: budgetBinders.description,
          currency: budgetBinders.currency,
        });

      if (!binder) {
        return reply.status(404).send({ error: 'Binder not found' });
      }

      return reply.send(binder);
    },
  );
}
