import { Router } from 'express';
import { getDiskStats } from './service.js';

export const diskRouter = Router();

diskRouter.get('/stats', async (_req, res) => {
  try {
    const data = await getDiskStats();
    res.json({ ok: true, data, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: String(e instanceof Error ? e.message : e),
      timestamp: Date.now(),
    });
  }
});
