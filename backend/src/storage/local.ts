import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir, platform } from 'os';
import { existsSync } from 'fs';
import { StorageProvider } from './types';

function getDataDir(): string {
  const platformName = platform();
  const home = homedir();

  if (platformName === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'Midas', 'data');
  }
  if (platformName === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Midas', 'data');
  }
  return join(home, '.local', 'share', 'Midas', 'data');
}

const DATA_DIR = getDataDir();

export const localProvider: StorageProvider = {
  async init() {
    await mkdir(DATA_DIR, { recursive: true });
  },

  async uploadFile(objectName: string, buffer: Buffer) {
    const filePath = join(DATA_DIR, objectName);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, buffer);
  },

  async getFile(objectName: string): Promise<Buffer> {
    return readFile(join(DATA_DIR, objectName));
  },

  async deleteFile(objectName: string) {
    const filePath = join(DATA_DIR, objectName);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  },

  generateObjectName(binderId: string, transactionId: string, fileName: string) {
    const uniqueSuffix = crypto.randomUUID();
    return `${binderId}/${transactionId}/${uniqueSuffix}-${fileName}`;
  },
};
