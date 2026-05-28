import { Router } from 'express';
import SftpClient from 'ssh2-sftp-client';
import { configManager } from '../../config/config-manager.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { FileEntry } from '../../../../shared/types/index.js';

export const sftpRouter = Router();

async function getSftpClient(connectionId: string): Promise<SftpClient> {
  const conn = configManager.get().connections.find(c => c.id === connectionId);
  if (!conn) throw new Error('Connection not found');

  const sftp = new SftpClient();
  const config: any = {
    host: conn.host,
    port: conn.port,
    username: conn.username,
  };

  if (conn.authType === 'key' && conn.privateKeyPath) {
    config.privateKey = await readFile(conn.privateKeyPath, 'utf-8');
  }

  await sftp.connect(config);
  return sftp;
}

sftpRouter.get('/:connectionId/list', async (req, res) => {
  let sftp: SftpClient | null = null;
  try {
    sftp = await getSftpClient(req.params.connectionId);
    const conn = configManager.get().connections.find(c => c.id === req.params.connectionId)!;
    const path = (req.query.path as string) || conn.basePath;
    const listing = await sftp.list(path);

    const files: FileEntry[] = listing.map(item => ({
      name: item.name,
      path: join(path, item.name),
      type: item.type === 'd' ? 'directory' : item.type === 'l' ? 'symlink' : 'file',
      size: item.size,
      modified: new Date(item.modifyTime).getTime(),
      permissions: String(item.rights?.other || ''),
    }));

    res.json({ ok: true, data: files, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  } finally {
    await sftp?.end();
  }
});

sftpRouter.get('/:connectionId/read', async (req, res) => {
  let sftp: SftpClient | null = null;
  try {
    sftp = await getSftpClient(req.params.connectionId);
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ ok: false, error: 'path required', timestamp: Date.now() });
      return;
    }
    const content = await sftp.get(filePath);
    res.json({ ok: true, data: { path: filePath, content: content.toString() }, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  } finally {
    await sftp?.end();
  }
});

sftpRouter.put('/:connectionId/write', async (req, res) => {
  let sftp: SftpClient | null = null;
  try {
    sftp = await getSftpClient(req.params.connectionId);
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
      res.status(400).json({ ok: false, error: 'path and content required', timestamp: Date.now() });
      return;
    }
    await sftp.put(Buffer.from(content, 'utf-8'), filePath);
    res.json({ ok: true, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  } finally {
    await sftp?.end();
  }
});

sftpRouter.delete('/:connectionId/delete', async (req, res) => {
  let sftp: SftpClient | null = null;
  try {
    sftp = await getSftpClient(req.params.connectionId);
    const filePath = req.query.path as string;
    if (!filePath) {
      res.status(400).json({ ok: false, error: 'path required', timestamp: Date.now() });
      return;
    }
    await sftp.delete(filePath);
    res.json({ ok: true, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  } finally {
    await sftp?.end();
  }
});
