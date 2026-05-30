import { Router } from 'express';
import { deployNginxSite, getLocalSites } from './service.js';

export const sitesRouter = Router();

sitesRouter.get('/list', async (_req, res) => {
  try {
    const sites = await getLocalSites();
    res.json({ ok: true, data: sites, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});

sitesRouter.post('/nginx/deploy', async (req, res) => {
  try {
    const result = await deployNginxSite(req.body);
    res.json({ ok: true, data: result, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});
