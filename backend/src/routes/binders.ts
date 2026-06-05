import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { budgetBinders } from '../db/schema';

interface CreateBinderBody {
  name: string;
  password: string;
  description?: string;
  currency?: string;
}

interface LoginBody {
  name: string;
  password: string;
}

export async function binderRoutes(app: FastifyInstance) {
  app.get('/binders', async (_req, reply) => {
    const binders = await db
      .select({
        id: budgetBinders.id,
        name: budgetBinders.name,
        description: budgetBinders.description,
        currency: budgetBinders.currency,
      })
      .from(budgetBinders)
      .orderBy(budgetBinders.createdAt);
    return reply.send(binders);
  });

  app.post<{ Body: CreateBinderBody }>('/binders', async (req, reply) => {
    const { name, password, description, currency } = req.body;

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

    const passwordHash = await bcrypt.hash(password, 10);
    const [binder] = await db
      .insert(budgetBinders)
      .values({
        name: name.trim(),
        passwordHash,
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
  });

  app.get<{ Params: { id: string } }>('/binders/:id', async (req, reply) => {
    const [binder] = await db
      .select({
        id: budgetBinders.id,
        name: budgetBinders.name,
        description: budgetBinders.description,
        currency: budgetBinders.currency,
      })
      .from(budgetBinders)
      .where(eq(budgetBinders.id, req.params.id));
    if (!binder) {
      return reply.status(404).send({ error: 'Binder not found' });
    }
    return reply.send(binder);
  });

  app.put<{ Params: { id: string }; Body: { name?: string; currency?: string } }>(
    '/binders/:id',
    async (req, reply) => {
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

  app.post<{ Body: LoginBody }>('/binders/login', async (req, reply) => {
    const { name, password } = req.body;
    const [binder] = await db
      .select()
      .from(budgetBinders)
      .where(eq(budgetBinders.name, name));
    if (!binder) {
      return reply.status(401).send({ error: 'Invalid name or password' });
    }
    const valid = await bcrypt.compare(password, binder.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid name or password' });
    }
    return reply.send({ id: binder.id, name: binder.name });
  });
}
