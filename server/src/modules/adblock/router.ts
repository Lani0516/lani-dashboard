import { Router } from 'express';
import { getAdblockStats } from './service.js';

export const adblockRouter = Router();

adblockRouter.get('/stats', async (req, res) => {
  try {
    const host = (req.query.host as string) || '';
    const version = (req.query.version as string) === 'v5' ? 'v5' : 'v6';
    const token = (req.query.token as string) || '';
    if (!host) {
      return res.status(400).json({ ok: false, error: 'host required', timestamp: Date.now() });
    }
    const stats = await getAdblockStats(host, version, token);
    res.json({ ok: true, data: stats, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});
