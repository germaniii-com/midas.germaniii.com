import 'dotenv/config';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { binderRoutes } from './routes/binders';
import { tagRoutes } from './routes/tags';

const app = Fastify({ logger: true });

app.register(cors);

async function routes(app: FastifyInstance) {
  app.get('/health', async (_req, _reply) => {
    return { status: 'ok' };
  });
  app.register(binderRoutes);
  app.register(tagRoutes);
}

app.register(routes, { prefix: '/api' });

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
