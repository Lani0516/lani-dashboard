import { Router } from 'express';
import { getStatus, addTarget, removeTarget } from './service.js';
import type { UptimeTarget } from '../../../../shared/types/index.js';

export const uptimeRouter = Router();

uptimeRouter.get('/status', (_req, res) => {
  try {
    const data = getStatus();
    res.json({ ok: true, data, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});

uptimeRouter.post('/', async (req, res) => {
  try {
    const { label, type, target, expectedStatus } = req.body ?? {};
    if (!label || typeof label !== 'string') {
      return res.status(400).json({ ok: false, error: 'label required', timestamp: Date.now() });
    }
    if (!['http', 'tcp', 'ping'].includes(type)) {
      return res.status(400).json({ ok: false, error: 'type must be http, tcp or ping', timestamp: Date.now() });
    }
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ ok: false, error: 'target required', timestamp: Date.now() });
    }
    const input: Omit<UptimeTarget, 'id'> = {
      label: label.trim(),
      type,
      target: target.trim(),
      ...(expectedStatus ? { expectedStatus: Number(expectedStatus) } : {}),
    };
    const created = await addTarget(input);
    res.json({ ok: true, data: created, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});

uptimeRouter.delete('/:id', async (req, res) => {
  try {
    await removeTarget(req.params.id);
    res.json({ ok: true, data: null, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});
