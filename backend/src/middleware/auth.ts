import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { budgetBinders } from '../db/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'midas-dev-secret';

export function signToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    (request as any).user = decoded;
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function verifyBinderOwnership(
  binderId: string,
  userId: string,
) {
  const [binder] = await db
    .select({ id: budgetBinders.id })
    .from(budgetBinders)
    .where(
      and(
        eq(budgetBinders.id, binderId),
        eq(budgetBinders.userId, userId),
      ),
    );
  if (!binder) {
    throw new Error('Binder not found');
  }
  return binder;
}
