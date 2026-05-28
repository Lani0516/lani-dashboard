import { Router } from 'express';
import { sendWOL } from './service.js';

export const wolRouter = Router();

wolRouter.post('/wake', async (req, res) => {
  try {
    const { mac, broadcastAddress } = req.body;
    if (!mac) {
      res.status(400).json({ ok: false, error: 'MAC address required', timestamp: Date.now() });
      return;
    }
    await sendWOL(mac, broadcastAddress);
    res.json({ ok: true, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});
