import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { payees } from '../db/schema';

interface CreatePayeeBody {
  name: string;
}

interface UpdatePayeeBody {
  name?: string;
}

export async function payeeRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/binders/:id/payees',
    async (req, reply) => {
      const list = await db
        .select()
        .from(payees)
        .where(eq(payees.binderId, req.params.id))
        .orderBy(payees.name);
      return reply.send(list);
    },
  );

  app.post<{ Params: { id: string }; Body: CreatePayeeBody }>(
    '/binders/:id/payees/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name } = req.body;

      if (!name?.trim()) {
        return reply.status(400).send({ error: 'Name is required' });
      }

      const [existing] = await db
        .select({ id: payees.id })
        .from(payees)
        .where(
          and(
            eq(payees.binderId, id),
            sql`LOWER(${payees.name}) = LOWER(${name.trim()})`,
          ),
        )
        .limit(1);

      if (existing) {
        return reply
          .status(409)
          .send({ error: 'A payee with this name already exists in this binder' });
      }

      const [payee] = await db
        .insert(payees)
        .values({ binderId: id, name: name.trim() })
        .returning();

      return reply.status(201).send(payee);
    },
  );

  app.get<{ Params: { id: string; payeeId: string } }>(
    '/binders/:id/payees/:payeeId',
    async (req, reply) => {
      const [payee] = await db
        .select()
        .from(payees)
        .where(
          and(
            eq(payees.id, req.params.payeeId),
            eq(payees.binderId, req.params.id),
          ),
        );

      if (!payee) {
        return reply.status(404).send({ error: 'Payee not found' });
      }

      return reply.send(payee);
    },
  );

  app.put<{ Params: { id: string; payeeId: string }; Body: UpdatePayeeBody }>(
    '/binders/:id/payees/:payeeId',
    async (req, reply) => {
      const { id, payeeId } = req.params;
      const { name } = req.body;

      if (name !== undefined && !name.trim()) {
        return reply.status(400).send({ error: 'Name cannot be empty' });
      }

      if (name !== undefined) {
        const [existing] = await db
          .select({ id: payees.id })
          .from(payees)
          .where(
            and(
              eq(payees.binderId, id),
              sql`LOWER(${payees.name}) = LOWER(${name.trim()})`,
              sql`${payees.id} != ${payeeId}`,
            ),
          )
          .limit(1);

        if (existing) {
          return reply
            .status(409)
            .send({ error: 'A payee with this name already exists in this binder' });
        }
      }

      const updates: Partial<typeof payees.$inferInsert> = {};
      if (name !== undefined) updates.name = name.trim();

      const [payee] = await db
        .update(payees)
        .set(updates)
        .where(eq(payees.id, payeeId))
        .returning();

      if (!payee) {
        return reply.status(404).send({ error: 'Payee not found' });
      }

      return reply.send(payee);
    },
  );

  app.delete<{ Params: { id: string; payeeId: string } }>(
    '/binders/:id/payees/:payeeId',
    async (req, reply) => {
      const [payee] = await db
        .delete(payees)
        .where(
          and(
            eq(payees.id, req.params.payeeId),
            eq(payees.binderId, req.params.id),
          ),
        )
        .returning({ id: payees.id });

      if (!payee) {
        return reply.status(404).send({ error: 'Payee not found' });
      }

      return reply.status(204).send();
    },
  );
}
