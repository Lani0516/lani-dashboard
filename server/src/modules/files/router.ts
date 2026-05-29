import { Router, raw } from 'express';
import { promises as fs } from 'fs';
import { join, basename } from 'path';
import {
  FILES_ROOT,
  listDir,
  readFileText,
  writeFileText,
  makeDir,
  removePath,
  renamePath,
  safePath,
} from './service.js';

export const filesRouter = Router();

const ok = (data: unknown) => ({ ok: true, data, timestamp: Date.now() });
const fail = (e: unknown) => ({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });

filesRouter.get('/root', (_req, res) => {
  res.json(ok({ root: FILES_ROOT }));
});

filesRouter.get('/list', async (req, res) => {
  try {
    res.json(ok(await listDir(req.query.path as string)));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

filesRouter.get('/read', async (req, res) => {
  try {
    const path = req.query.path as string;
    res.json(ok({ path, content: await readFileText(path) }));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

filesRouter.put('/write', async (req, res) => {
  try {
    const { path, content } = req.body;
    if (!path || content === undefined) throw new Error('path and content required');
    await writeFileText(path, content);
    res.json(ok(null));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

filesRouter.post('/mkdir', async (req, res) => {
  try {
    if (!req.body?.path) throw new Error('path required');
    await makeDir(req.body.path);
    res.json(ok(null));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

filesRouter.delete('/delete', async (req, res) => {
  try {
    await removePath(req.query.path as string);
    res.json(ok(null));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

filesRouter.post('/rename', async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) throw new Error('from and to required');
    await renamePath(from, to);
    res.json(ok(null));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

filesRouter.get('/download', async (req, res) => {
  try {
    const file = safePath(req.query.path as string);
    res.download(file, basename(file));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});

// Raw binary upload: POST /upload?dir=<dir>&name=<filename>
filesRouter.post('/upload', raw({ limit: '512mb', type: '*/*' }), async (req, res) => {
  try {
    const dir = req.query.dir as string;
    const name = basename((req.query.name as string) || '');
    if (!name) throw new Error('name required');
    const dest = safePath(join(safePath(dir), name));
    await fs.writeFile(dest, req.body);
    res.json(ok({ path: dest }));
  } catch (e) {
    res.status(400).json(fail(e));
  }
});
