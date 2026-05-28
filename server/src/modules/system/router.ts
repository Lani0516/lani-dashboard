import { Router } from 'express';
import { getSystemStats, getConnectedDevices } from './service.js';

export const systemRouter = Router();

systemRouter.get('/stats', async (_req, res) => {
  try {
    const stats = await getSystemStats();
    res.json({ ok: true, data: stats, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});

systemRouter.get('/devices', async (_req, res) => {
  try {
    const devices = await getConnectedDevices();
    res.json({ ok: true, data: devices, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});
