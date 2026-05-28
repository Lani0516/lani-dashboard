import { Router } from 'express';
import { queryMinecraftServer } from './service.js';

export const minecraftRouter = Router();

minecraftRouter.get('/status', async (req, res) => {
  try {
    const host = (req.query.host as string) || 'localhost';
    const port = parseInt((req.query.port as string) || '25565');
    const status = await queryMinecraftServer(host, port);
    res.json({ ok: true, data: status, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});
