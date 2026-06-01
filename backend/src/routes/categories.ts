import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { categories, accountCategories } from '../db/schema';

interface CreateCategoryBody {
  name: string;
}

interface UpdateCategoryBody {
  name?: string;
}

export async function categoryRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>(
    '/binders/:id/categories',
    async (req, reply) => {
      const categoryList = await db
        .select()
        .from(categories)
        .where(eq(categories.binderId, req.params.id))
        .orderBy(categories.name);
      return reply.send(categoryList);
    },
  );

  app.post<{ Params: { id: string }; Body: CreateCategoryBody }>(
    '/binders/:id/categories/create',
    async (req, reply) => {
      const { id } = req.params;
      const { name } = req.body;

      if (!name?.trim()) {
        return reply.status(400).send({ error: 'Name is required' });
      }

      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.binderId, id),
            sql`LOWER(${categories.name}) = LOWER(${name.trim()})`,
          ),
        )
        .limit(1);

      if (existing) {
        return reply
          .status(409)
          .send({ error: 'A category with this name already exists in this binder' });
      }

      const [category] = await db
        .insert(categories)
        .values({
          binderId: id,
          name: name.trim(),
        })
        .returning();

      return reply.status(201).send(category);
    },
  );

  app.get<{ Params: { id: string; categoryId: string } }>(
    '/binders/:id/categories/:categoryId',
    async (req, reply) => {
      const [category] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.id, req.params.categoryId),
            eq(categories.binderId, req.params.id),
          ),
        );

      if (!category) {
        return reply.status(404).send({ error: 'Category not found' });
      }

      return reply.send(category);
    },
  );

  app.put<{ Params: { id: string; categoryId: string }; Body: UpdateCategoryBody }>(
    '/binders/:id/categories/:categoryId',
    async (req, reply) => {
      const { id, categoryId } = req.params;
      const { name } = req.body;

      if (name !== undefined && !name.trim()) {
        return reply.status(400).send({ error: 'Name cannot be empty' });
      }

      if (name !== undefined) {
        const [existing] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.binderId, id),
              sql`LOWER(${categories.name}) = LOWER(${name.trim()})`,
              sql`${categories.id} != ${categoryId}`,
            ),
          )
          .limit(1);

        if (existing) {
          return reply
            .status(409)
            .send({ error: 'A category with this name already exists in this binder' });
        }
      }

      const updates: Partial<typeof categories.$inferInsert> = {};
      if (name !== undefined) updates.name = name.trim();

      const [category] = await db
        .update(categories)
        .set(updates)
        .where(eq(categories.id, categoryId))
        .returning();

      if (!category) {
        return reply.status(404).send({ error: 'Category not found' });
      }

      return reply.send(category);
    },
  );

  app.delete<{ Params: { id: string; categoryId: string } }>(
    '/binders/:id/categories/:categoryId',
    async (req, reply) => {
      const [category] = await db
        .delete(categories)
        .where(
          and(
            eq(categories.id, req.params.categoryId),
            eq(categories.binderId, req.params.id),
          ),
        )
        .returning({ id: categories.id });

      if (!category) {
        return reply.status(404).send({ error: 'Category not found' });
      }

      return reply.status(204).send();
    },
  );
}
