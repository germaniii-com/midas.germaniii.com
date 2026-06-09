import { Client } from 'minio';
import { Readable } from 'stream';

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'midas-attachments';

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME);
  }
}

export async function uploadFile(objectName: string, buffer: Buffer, mimeType: string): Promise<void> {
  await minioClient.putObject(BUCKET_NAME, objectName, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
}

export async function getFile(objectName: string): Promise<Buffer> {
  const stream = await minioClient.getObject(BUCKET_NAME, objectName);
  const chunks: Buffer[] = [];
  for await (const chunk of stream as Readable) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function deleteFile(objectName: string): Promise<void> {
  await minioClient.removeObject(BUCKET_NAME, objectName);
}

function generateObjectName(binderId: string, transactionId: string, fileName: string): string {
  const uniqueSuffix = crypto.randomUUID();
  return `${binderId}/${transactionId}/${uniqueSuffix}-${fileName}`;
}

export { minioClient, BUCKET_NAME, generateObjectName };
