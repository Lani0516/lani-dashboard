import { Router } from 'express';
import { getAllAIUsage, getAIUsageByProvider } from './service.js';

export const aiTokensRouter = Router();

aiTokensRouter.get('/', async (_req, res) => {
  try {
    const usage = await getAllAIUsage();
    res.json({ ok: true, data: usage, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});

aiTokensRouter.get('/:id', async (req, res) => {
  try {
    const usage = await getAIUsageByProvider(req.params.id);
    if (!usage) {
      res.status(404).json({ ok: false, error: 'Provider not found', timestamp: Date.now() });
      return;
    }
    res.json({ ok: true, data: usage, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});
