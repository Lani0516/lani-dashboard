import { Router } from 'express';
import { configManager } from './config-manager.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  res.json({ ok: true, data: configManager.get(), timestamp: Date.now() });
});

configRouter.put('/', async (req, res) => {
  const config = await configManager.update(req.body);
  res.json({ ok: true, data: config, timestamp: Date.now() });
});

configRouter.post('/ai-providers', async (req, res) => {
  await configManager.addAIProvider(req.body);
  res.json({ ok: true, data: configManager.get().aiProviders, timestamp: Date.now() });
});

configRouter.delete('/ai-providers/:id', async (req, res) => {
  await configManager.removeAIProvider(req.params.id);
  res.json({ ok: true, timestamp: Date.now() });
});

configRouter.post('/connections', async (req, res) => {
  await configManager.addConnection(req.body);
  res.json({ ok: true, data: configManager.get().connections, timestamp: Date.now() });
});

configRouter.delete('/connections/:id', async (req, res) => {
  await configManager.removeConnection(req.params.id);
  res.json({ ok: true, timestamp: Date.now() });
});

configRouter.put('/widgets', async (req, res) => {
  await configManager.updateWidgets(req.body.widgets);
  res.json({ ok: true, data: configManager.get().widgets, timestamp: Date.now() });
});
