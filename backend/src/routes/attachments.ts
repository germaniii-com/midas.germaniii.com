import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '../db';
import { transactionAttachments } from '../db/schema';
import { storage } from '../storage';

async function getAttachment(transactionId: string, attachmentId: string) {
  const [attachment] = await db
    .select()
    .from(transactionAttachments)
    .where(
      and(
        eq(transactionAttachments.id, attachmentId),
        eq(transactionAttachments.transactionId, transactionId),
      ),
    )
    .limit(1);
  return attachment;
}

export async function attachmentRoutes(app: FastifyInstance) {
  app.post<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments',
    async (req, reply) => {
      const { id: binderId, transactionId } = req.params;

      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ error: 'File is required' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      let buffer = Buffer.concat(chunks);
      const fileName = data.filename;
      let mimeType = data.mimetype || 'application/octet-stream';

      const isImage = mimeType.startsWith('image/') && mimeType !== 'image/gif';
      if (isImage) {
        buffer = Buffer.from(await sharp(buffer).webp({ quality: 80 }).toBuffer());
        mimeType = 'image/webp';
      }

      const existing = await db
        .select({ id: transactionAttachments.id, objectName: transactionAttachments.objectName })
        .from(transactionAttachments)
        .where(
          and(
            eq(transactionAttachments.transactionId, transactionId),
            eq(transactionAttachments.fileName, fileName),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return reply.status(409).send({ error: `A file named "${fileName}" already exists on this transaction` });
      }

      const objectName = storage.generateObjectName(binderId, transactionId, fileName);
      await storage.uploadFile(objectName, buffer, mimeType);

      const [attachment] = await db
        .insert(transactionAttachments)
        .values({
          transactionId,
          binderId,
          fileName,
          objectName,
          mimeType,
          fileSize: buffer.length,
        })
        .returning();

      return reply.status(201).send(attachment);
    },
  );

  app.get<{ Params: { id: string; transactionId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments',
    async (req, reply) => {
      const { transactionId } = req.params;

      const attachments = await db
        .select({
          id: transactionAttachments.id,
          fileName: transactionAttachments.fileName,
          mimeType: transactionAttachments.mimeType,
          fileSize: transactionAttachments.fileSize,
          createdAt: transactionAttachments.createdAt,
        })
        .from(transactionAttachments)
        .where(eq(transactionAttachments.transactionId, transactionId))
        .orderBy(transactionAttachments.createdAt);

      return reply.send(attachments);
    },
  );

  app.get<{ Params: { id: string; transactionId: string; attachmentId: string }; Querystring: { preview?: string } }>(
    '/binders/:id/transactions/:transactionId/attachments/:attachmentId',
    async (req, reply) => {
      const { transactionId, attachmentId } = req.params;
      const preview = req.query.preview === 'true';

      const attachment = await getAttachment(transactionId, attachmentId);
      if (!attachment) {
        return reply.status(404).send({ error: 'Attachment not found' });
      }

      const buffer = await storage.getFile(attachment.objectName);

      return reply
        .header('Content-Type', attachment.mimeType || 'application/octet-stream')
        .header('Content-Disposition', preview ? `inline; filename="${attachment.fileName}"` : `attachment; filename="${attachment.fileName}"`)
        .send(buffer);
    },
  );

  app.get<{ Params: { id: string; transactionId: string; attachmentId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments/:attachmentId/thumbnail',
    async (req, reply) => {
      const { transactionId, attachmentId } = req.params;

      const attachment = await getAttachment(transactionId, attachmentId);
      if (!attachment) {
        return reply.status(404).send({ error: 'Attachment not found' });
      }

      const isImage = attachment.mimeType?.startsWith('image/');
      if (!isImage) {
        return reply.status(400).send({ error: 'Thumbnail not available for non-image files' });
      }

      const buffer = await storage.getFile(attachment.objectName);
      const thumbnail = Buffer.from(await sharp(buffer).resize(120).webp({ quality: 70 }).toBuffer());

      return reply
        .header('Content-Type', 'image/webp')
        .header('Cache-Control', 'public, max-age=86400')
        .send(thumbnail);
    },
  );

  app.delete<{ Params: { id: string; transactionId: string; attachmentId: string } }>(
    '/binders/:id/transactions/:transactionId/attachments/:attachmentId',
    async (req, reply) => {
      const { transactionId, attachmentId } = req.params;

      const attachment = await getAttachment(transactionId, attachmentId);
      if (!attachment) {
        return reply.status(404).send({ error: 'Attachment not found' });
      }

      await storage.deleteFile(attachment.objectName);

      await db
        .delete(transactionAttachments)
        .where(eq(transactionAttachments.id, attachmentId));

      return reply.status(204).send();
    },
  );
}
