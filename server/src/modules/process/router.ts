import { Router } from 'express';
import { getProcessList, killProcess } from './service.js';

export const processRouter = Router();

processRouter.get('/list', async (req, res) => {
  try {
    const sort = (req.query.sort as string) === 'mem' ? 'mem' : 'cpu';
    const q = (req.query.q as string) || '';
    const limit = Number(req.query.limit) || 30;
    const data = await getProcessList(sort, q, limit);
    res.json({ ok: true, data, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});

processRouter.post('/kill', (req, res) => {
  const pid = Number(req.body?.pid);
  const signal = req.body?.signal === 'SIGKILL' ? 'SIGKILL' : 'SIGTERM';
  if (!Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ ok: false, error: 'pid must be a positive integer', timestamp: Date.now() });
  }
  const result = killProcess(pid, signal);
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.error, timestamp: Date.now() });
  }
  res.json({ ok: true, data: result, timestamp: Date.now() });
});
