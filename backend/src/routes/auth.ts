import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { authenticate, signToken } from '../middleware/auth';

interface RegisterBody {
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>('/auth/register', async (req, reply) => {
    const { email, password } = req.body;

    if (!email?.trim()) {
      return reply.status(400).send({ error: 'Email is required' });
    }
    if (!password?.trim()) {
      return reply.status(400).send({ error: 'Password is required' });
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    if (existing) {
      return reply.status(409).send({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(users)
      .values({
        email: email.trim().toLowerCase(),
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    const token = signToken({ id: user.id, email: user.email });
    return reply.status(201).send({ user, token });
  });

  app.post<{ Body: LoginBody }>('/auth/login', async (req, reply) => {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    if (!user) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user.id, email: user.email });
    return reply.send({
      user: { id: user.id, email: user.email },
      token,
    });
  });

  app.get('/auth/me', { preHandler: [authenticate] }, async (req, reply) => {
    const decoded = (req as any).user as { id: string; email: string };
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, decoded.id));
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return reply.send(user);
  });
}
