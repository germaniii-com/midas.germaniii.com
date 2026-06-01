import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { tags } from '../db/schema';

interface CreateTagBody {
  name: string;
  color?: string;
}

interface UpdateTagBody {
  name?: string;
  color?: string;
}

export async function tagRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/binders/:id/tags',
    async (req, reply) => {
      const tagList = await db
        .select()
        .from(tags)
        .where(eq(tags.binderId, req.params.id))
        .orderBy(tags.name);
      return reply.send(tagList);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateTagBody }>(
    '/binders/:id/tags/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name, color } = req.body;

      if (!name?.trim()) {
        return reply.status(400).send({ error: 'Name is required' });
      }

      const [existing] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(
          and(
            eq(tags.binderId, id),
            sql`LOWER(${tags.name}) = LOWER(${name.trim()})`,
          ),
        )
        .limit(1);

      if (existing) {
        return reply
          .status(409)
          .send({ error: 'A tag with this name already exists in this binder' });
      }

      const [tag] = await db
        .insert(tags)
        .values({
          binderId: id,
          name: name.trim(),
          color: color ?? '#3B82F6',
        })
        .returning();

      return reply.status(201).send(tag);
    },
  );

  app.get<{ Params: { id: string; tagId: string } }>(
    '/binders/:id/tags/:tagId',
    async (req, reply) => {
      const [tag] = await db
        .select()
        .from(tags)
        .where(
          and(
            eq(tags.id, req.params.tagId),
            eq(tags.binderId, req.params.id),
          ),
        );

      if (!tag) {
        return reply.status(404).send({ error: 'Tag not found' });
      }

      return reply.send(tag);
    },
  );

  app.put<{ Params: { id: string; tagId: string }; Body: UpdateTagBody }>(
    '/binders/:id/tags/:tagId',
    async (req, reply) => {
      const { id, tagId } = req.params;
      const { name, color } = req.body;

      if (name !== undefined && !name.trim()) {
        return reply.status(400).send({ error: 'Name cannot be empty' });
      }

      if (name !== undefined) {
        const [existing] = await db
          .select({ id: tags.id })
          .from(tags)
          .where(
            and(
              eq(tags.binderId, id),
              sql`LOWER(${tags.name}) = LOWER(${name.trim()})`,
              sql`${tags.id} != ${tagId}`,
            ),
          )
          .limit(1);

        if (existing) {
          return reply
            .status(409)
            .send({
              error: 'A tag with this name already exists in this binder',
            });
        }
      }

      const updates: Partial<typeof tags.$inferInsert> = {};
      if (name !== undefined) updates.name = name.trim();
      if (color !== undefined) updates.color = color;

      const [tag] = await db
        .update(tags)
        .set(updates)
        .where(eq(tags.id, tagId))
        .returning();

      if (!tag) {
        return reply.status(404).send({ error: 'Tag not found' });
      }

      return reply.send(tag);
    },
  );

  app.delete<{ Params: { id: string; tagId: string } }>(
    '/binders/:id/tags/:tagId',
    async (req, reply) => {
      const [tag] = await db
        .delete(tags)
        .where(
          and(
            eq(tags.id, req.params.tagId),
            eq(tags.binderId, req.params.id),
          ),
        )
        .returning({ id: tags.id });

      if (!tag) {
        return reply.status(404).send({ error: 'Tag not found' });
      }

      return reply.status(204).send();
    },
  );
}
