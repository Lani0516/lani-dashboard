import { Router } from 'express';
import { getSensorsStats } from './service.js';

export const sensorsRouter = Router();

sensorsRouter.get('/stats', async (_req, res) => {
  try {
    const data = await getSensorsStats();
    res.json({ ok: true, data, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});
