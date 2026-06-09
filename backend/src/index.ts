import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { binderRoutes } from './routes/binders';
import { binderIORoutes } from './routes/binder-io';
import { actualImportRoutes } from './routes/actual-import';
import { tagRoutes } from './routes/tags';
import { categoryRoutes } from './routes/categories';
import { accountRoutes } from './routes/accounts';
import { transactionRoutes } from './routes/transactions';
import { payeeRoutes } from './routes/payees';
import { paymentScheduleRoutes } from './routes/payment-schedules';
import { reportRoutes } from './routes/reports';
import { attachmentRoutes } from './routes/attachments';
import { authRoutes } from './routes/auth';
import { authenticate } from './middleware/auth';
import { ensureBucket } from './minio';

const app = Fastify({ logger: true });

app.register(cors);
app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// Public routes (no auth required)
app.register(
  async function publicRoutes(instance: FastifyInstance) {
    instance.get('/health', async (_req, _reply) => {
      return { status: 'ok' };
    });
    instance.register(authRoutes);
  },
  { prefix: '/api' },
);

// Protected routes (auth required)
app.register(
  async function protectedRoutes(instance: FastifyInstance) {
    instance.addHook('preHandler', authenticate);

    instance.register(binderRoutes);
    instance.register(binderIORoutes);
    instance.register(actualImportRoutes);
    instance.register(tagRoutes);
    instance.register(categoryRoutes);
    instance.register(accountRoutes);
    instance.register(transactionRoutes);
    instance.register(payeeRoutes);
    instance.register(paymentScheduleRoutes);
    instance.register(reportRoutes);
    instance.register(attachmentRoutes);
  },
  { prefix: '/api' },
);

const start = async () => {
  try {
    await ensureBucket();
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
