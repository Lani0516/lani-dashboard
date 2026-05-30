import { Router } from 'express';
import {
  getDockerStatus,
  startContainer,
  stopContainer,
  restartContainer,
  getContainerLogs,
  getImages,
  pruneImages,
  getVolumes,
} from './service.js';

export const dockerRouter = Router();

const ok = (res: any, data: unknown) => res.json({ ok: true, data, timestamp: Date.now() });
const fail = (res: any, e: unknown, code = 500) =>
  res.status(code).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });

// GET endpoints degrade gracefully — never 500 the poll if Docker is absent.
dockerRouter.get('/status', async (_req, res) => {
  try {
    ok(res, await getDockerStatus());
  } catch (e) {
    res.json({ ok: true, data: { available: false, error: String(e), containers: [] }, timestamp: Date.now() });
  }
});

dockerRouter.get('/images', async (_req, res) => {
  try {
    ok(res, await getImages());
  } catch (e) {
    res.json({ ok: true, data: { available: false, images: [], error: String(e) }, timestamp: Date.now() });
  }
});

dockerRouter.get('/volumes', async (_req, res) => {
  try {
    ok(res, await getVolumes());
  } catch (e) {
    res.json({ ok: true, data: { available: false, volumes: [], error: String(e) }, timestamp: Date.now() });
  }
});

dockerRouter.get('/containers/:id/logs', async (req, res) => {
  try {
    const tail = Number(req.query.tail) || 200;
    const logs = await getContainerLogs(req.params.id, tail);
    ok(res, { logs });
  } catch (e) {
    fail(res, e);
  }
});

dockerRouter.post('/containers/:id/start', async (req, res) => {
  try {
    await startContainer(req.params.id);
    ok(res, { id: req.params.id, action: 'start' });
  } catch (e) {
    fail(res, e);
  }
});

dockerRouter.post('/containers/:id/stop', async (req, res) => {
  try {
    await stopContainer(req.params.id);
    ok(res, { id: req.params.id, action: 'stop' });
  } catch (e) {
    fail(res, e);
  }
});

dockerRouter.post('/containers/:id/restart', async (req, res) => {
  try {
    await restartContainer(req.params.id);
    ok(res, { id: req.params.id, action: 'restart' });
  } catch (e) {
    fail(res, e);
  }
});

dockerRouter.post('/images/prune', async (_req, res) => {
  try {
    ok(res, await pruneImages());
  } catch (e) {
    fail(res, e);
  }
});
