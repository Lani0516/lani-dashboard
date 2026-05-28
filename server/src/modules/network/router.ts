import { Router } from 'express';

export const networkRouter = Router();

// Placeholder — future: network config management
networkRouter.get('/status', (_req, res) => {
  res.json({ ok: true, data: { configured: false }, timestamp: Date.now() });
});
