import { FastifyInstance } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { db, sqliteDb } from '../db';
import { budgetBinders, syncTargets, syncJobs, transactionAttachments } from '../db/schema';
import { performSync, upsertRows } from '../services/sync-engine';
import { storage } from '../storage';
import { SyncScheduler } from '../services/sync-scheduler';

function checkSyncAuth(req: { headers: Record<string, unknown> }): boolean {
  const password = req.headers['x-sync-password'];
  const serverPassword = process.env.SERVER_PASSWORD;
  if (!serverPassword) {
    console.warn('[sync] SERVER_PASSWORD not set, rejecting sync request');
    return false;
  }
  if (!password) {
    console.warn('[sync] Missing x-sync-password header');
    return false;
  }
  if (String(password) !== serverPassword) {
    console.warn('[sync] x-sync-password mismatch');
    return false;
  }
  return true;
}

export async function syncRoutes(app: FastifyInstance) {
  // ─── Receiver endpoints (incoming sync data from remote instances) ───

  app.post('/sync/binder', async (req, reply) => {
    if (!checkSyncAuth(req)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { binder } = req.body as { binder: Record<string, unknown> };
    if (!binder || !binder.id) {
      return reply.status(400).send({ error: 'Invalid binder data' });
    }

    const byId = sqliteDb.prepare(
      'SELECT id FROM budget_binders WHERE id = ?',
    ).get(binder.id) as { id: string } | undefined;

    const byName = !byId ? sqliteDb.prepare(
      'SELECT id FROM budget_binders WHERE name = ?',
    ).get(binder.name) as { id: string } | undefined : undefined;

    if (byId) {
      sqliteDb.prepare(`
        UPDATE budget_binders SET name = ?, description = ?, currency = ?, updated_at = datetime('now') WHERE id = ?
      `).run(binder.name, binder.description, binder.currency, binder.id);
    } else if (byName) {
      sqliteDb.prepare(`
        UPDATE budget_binders SET id = ?, description = ?, currency = ?, updated_at = datetime('now') WHERE id = ?
      `).run(binder.id, binder.description, binder.currency, byName.id);
    } else {
      sqliteDb.prepare(`
        INSERT INTO budget_binders (id, name, description, currency, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        binder.id,
        binder.name || 'Synced Binder',
        binder.description || null,
        binder.currency || 'USD',
        binder.password_hash || '',
        binder.created_at || new Date().toISOString(),
        binder.updated_at || new Date().toISOString(),
      );
    }

    return reply.send({ id: binder.id });
  });

  app.post<{ Params: { binderId: string }; Querystring: { table: string } }>(
    '/sync/push/:binderId',
    async (req, reply) => {
      if (!checkSyncAuth(req)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { binderId } = req.params;
      const { table } = req.query;
      const { rows } = req.body as { rows: Record<string, unknown>[] };

      if (!table || !rows || !Array.isArray(rows) || rows.length === 0) {
        return reply.status(400).send({ error: 'Invalid request' });
      }

      console.log(`[sync] receiver push: binder=${binderId} table=${table} rows=${rows.length}`);

      const exists = sqliteDb.prepare(
        'SELECT id FROM budget_binders WHERE id = ?',
      ).get(binderId);
      if (!exists) {
        return reply.status(404).send({ error: 'Binder not found' });
      }

      upsertRows(table, rows);
      return reply.send({ synced: rows.length });
    },
  );

  app.get<{ Params: { binderId: string }; Querystring: { table: string; since?: string; limit?: string; offset?: string } }>(
    '/sync/pull/:binderId',
    async (req, reply) => {
      if (!checkSyncAuth(req)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { binderId } = req.params;
      const { table, since, limit, offset } = req.query;
      const limitNum = Math.min(parseInt(limit || '100', 10), 500);
      const offsetNum = parseInt(offset || '0', 10);

      if (!table) {
        return reply.status(400).send({ error: 'Table parameter required' });
      }

      const idColumn = table === 'budget_binders' ? 'id' : 'binder_id';
      let rows: Record<string, unknown>[];
      if (since) {
        rows = sqliteDb.prepare(
          `SELECT * FROM "${table}" WHERE ${idColumn} = ? AND updated_at > ? ORDER BY rowid LIMIT ? OFFSET ?`,
        ).all(binderId, since, limitNum, offsetNum) as Record<string, unknown>[];
      } else {
        rows = sqliteDb.prepare(
          `SELECT * FROM "${table}" WHERE ${idColumn} = ? ORDER BY rowid LIMIT ? OFFSET ?`,
        ).all(binderId, limitNum, offsetNum) as Record<string, unknown>[];
      }

      return reply.send({ rows });
    },
  );

  app.post<{ Params: { binderId: string } }>(
    '/sync/attachments/:binderId',
    async (req, reply) => {
      if (!checkSyncAuth(req)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const data = await req.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const metadataField = data.fields.metadata;
      let metadata: Record<string, unknown> = {};
      if (metadataField && 'value' in metadataField) {
        try {
          metadata = JSON.parse(String(metadataField.value));
        } catch {
          return reply.status(400).send({ error: 'Invalid metadata' });
        }
      }

      const objectName = metadata.object_name as string;
      if (!objectName) {
        return reply.status(400).send({ error: 'Missing object_name in metadata' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      await storage.uploadFile(
        objectName,
        fileBuffer,
        (metadata.mime_type as string) || data.mimetype || 'application/octet-stream',
      );

      upsertRows('transaction_attachments', [metadata]);

      return reply.send({ id: metadata.id });
    },
  );

  app.get<{ Params: { binderId: string; attachmentId: string } }>(
    '/sync/attachments/:binderId/:attachmentId',
    async (req, reply) => {
      if (!checkSyncAuth(req)) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { attachmentId } = req.params;

      const [att] = await db.select()
        .from(transactionAttachments)
        .where(eq(transactionAttachments.id, attachmentId))
        .limit(1);

      if (!att) {
        return reply.status(404).send({ error: 'Attachment not found' });
      }

      try {
        const buffer = await storage.getFile(att.objectName);
        return reply
          .header('Content-Type', att.mimeType || 'application/octet-stream')
          .header('Content-Disposition', `inline; filename="${att.fileName}"`)
          .send(buffer);
      } catch {
        return reply.status(404).send({ error: 'File not found in storage' });
      }
    },
  );

  // ─── Management endpoints (CRUD for sync targets) ───

  app.get<{ Params: { id: string } }>(
    '/binders/:id/sync-targets',
    async (req, reply) => {
      const targets = await db.select()
        .from(syncTargets)
        .where(eq(syncTargets.binderId, req.params.id))
        .orderBy(syncTargets.createdAt);

      return reply.send(
        targets.map((t) => ({
          id: t.id,
          binderId: t.binderId,
          host: t.host,
          autoSyncInterval: t.autoSyncInterval,
          lastSyncedAt: t.lastSyncedAt,
          lastSyncStatus: t.lastSyncStatus,
          lastError: t.lastError,
          createdAt: t.createdAt,
        })),
      );
    },
  );

  app.post<{ Params: { id: string }; Body: { host: string; password: string; autoSyncInterval?: number } }>(
    '/binders/:id/sync-targets',
    async (req, reply) => {
      const { id: binderId } = req.params;
      const { host, password, autoSyncInterval } = req.body;

      const [binder] = await db.select()
        .from(budgetBinders)
        .where(eq(budgetBinders.id, binderId))
        .limit(1);
      if (!binder) {
        return reply.status(404).send({ error: 'Binder not found' });
      }

      const [target] = await db.insert(syncTargets).values({
        binderId,
        host: host.replace(/\/+$/, ''),
        password,
        autoSyncInterval: autoSyncInterval ?? null,
      }).returning();

      try {
        const ss = SyncScheduler.getInstance();
        if (autoSyncInterval && autoSyncInterval > 0) {
          ss.add(target.id, autoSyncInterval, binderId, { host, password });
        }
      } catch {}

      return reply.status(201).send({
        id: target.id,
        binderId: target.binderId,
        host: target.host,
        autoSyncInterval: target.autoSyncInterval,
        lastSyncedAt: target.lastSyncedAt,
        lastSyncStatus: target.lastSyncStatus,
        lastError: target.lastError,
        createdAt: target.createdAt,
      });
    },
  );

  app.put<{ Params: { id: string; targetId: string }; Body: { host?: string; password?: string; autoSyncInterval?: number | null } }>(
    '/binders/:id/sync-targets/:targetId',
    async (req, reply) => {
      const { id: binderId, targetId } = req.params;
      const { host, password, autoSyncInterval } = req.body;

      const values: Record<string, unknown> = {};
      if (host !== undefined) values.host = host.replace(/\/+$/, '');
      if (password !== undefined) values.password = password;
      if (autoSyncInterval !== undefined) values.autoSyncInterval = autoSyncInterval;

      const [target] = await db.update(syncTargets)
        .set(values)
        .where(
          and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId)),
        )
        .returning();

      if (!target) {
        return reply.status(404).send({ error: 'Sync target not found' });
      }

      try {
        const ss = SyncScheduler.getInstance();
        ss.remove(targetId);
        if (target.autoSyncInterval && target.autoSyncInterval > 0) {
          ss.add(targetId, target.autoSyncInterval, binderId, {
            host: target.host,
            password: target.password,
          });
        }
      } catch {}

      return reply.send({
        id: target.id,
        binderId: target.binderId,
        host: target.host,
        autoSyncInterval: target.autoSyncInterval,
        lastSyncedAt: target.lastSyncedAt,
        lastSyncStatus: target.lastSyncStatus,
        lastError: target.lastError,
        createdAt: target.createdAt,
      });
    },
  );

  app.delete<{ Params: { id: string; targetId: string } }>(
    '/binders/:id/sync-targets/:targetId',
    async (req, reply) => {
      const { id: binderId, targetId } = req.params;

      await db.delete(syncTargets)
        .where(
          and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId)),
        );

      try {
        const ss = SyncScheduler.getInstance();
        ss.remove(targetId);
      } catch {}

      return reply.status(204).send();
    },
  );

  app.post<{ Params: { id: string; targetId: string } }>(
    '/binders/:id/sync-targets/:targetId/sync',
    async (req, reply) => {
      const { id: binderId, targetId } = req.params;

      const [target] = await db.select()
        .from(syncTargets)
        .where(
          and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId)),
        )
        .limit(1);

      if (!target) {
        return reply.status(404).send({ error: 'Sync target not found' });
      }

      const [runningJob] = await db.select()
        .from(syncJobs)
        .where(
          and(eq(syncJobs.targetId, targetId), eq(syncJobs.status, 'running')),
        )
        .limit(1);

      if (runningJob) {
        return reply.status(409).send({ error: 'Sync already in progress' });
      }

      await db.update(syncTargets).set({
        lastSyncStatus: 'syncing',
        lastError: null,
      }).where(eq(syncTargets.id, targetId));

      performSync(binderId, {
        id: target.id,
        host: target.host,
        password: target.password,
      }).catch((err) => {
        console.error(`Sync failed for target ${targetId}:`, err);
      });

      return reply.send({ message: 'Sync started' });
    },
  );

  app.get<{ Params: { id: string; targetId: string } }>(
    '/binders/:id/sync-targets/:targetId/status',
    async (req, reply) => {
      const { id: binderId, targetId } = req.params;

      const [target] = await db.select()
        .from(syncTargets)
        .where(
          and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId)),
        )
        .limit(1);

      if (!target) {
        return reply.status(404).send({ error: 'Sync target not found' });
      }

      const [activeJob] = await db.select()
        .from(syncJobs)
        .where(
          and(
            eq(syncJobs.targetId, targetId),
            eq(syncJobs.status, 'running'),
          ),
        )
        .orderBy(sql`${syncJobs.startedAt} DESC`)
        .limit(1);

      if (activeJob) {
        const total = activeJob.totalRecords ?? 0;
        const synced = activeJob.syncedRecords ?? 0;
        const progress = activeJob.phase === 'push' && total > 0
          ? Math.min(Math.round((synced / total) * 100), 100)
          : undefined;

        return reply.send({
          status: 'syncing',
          phase: activeJob.phase,
          currentTable: activeJob.currentTable,
          totalRecords: total,
          syncedRecords: synced,
          progress,
          lastSyncedAt: target.lastSyncedAt,
        });
      }

      return reply.send({
        status: target.lastSyncStatus,
        lastSyncedAt: target.lastSyncedAt,
        lastError: target.lastError,
      });
    },
  );

  app.get<{ Params: { id: string; targetId: string } }>(
    '/binders/:id/sync-targets/:targetId/export',
    async (req, reply) => {
      const { id: binderId, targetId } = req.params;

      const [target] = await db.select()
        .from(syncTargets)
        .where(
          and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId)),
        )
        .limit(1);

      if (!target) {
        return reply.status(404).send({ error: 'Sync target not found' });
      }

      const exportUrl = `${target.host}/api/binders/${binderId}/export`;

      try {
        const res = await fetch(exportUrl, {
          headers: {
            'x-sync-password': target.password,
          },
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Export failed');
          return reply.status(res.status).send({ error: errorText });
        }

        const contentType = res.headers.get('content-type') || 'application/sql';
        const contentDisposition = res.headers.get('content-disposition') || `attachment; filename="remote-export-${new Date().toISOString().slice(0, 10)}.sql"`;

        reply.header('Content-Type', contentType);
        reply.header('Content-Disposition', contentDisposition);

        if (!res.body) {
          return reply.status(502).send({ error: 'No response body from remote' });
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        return reply.send(buffer);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch export from remote';
        return reply.status(502).send({ error: message });
      }
    },
  );
}
