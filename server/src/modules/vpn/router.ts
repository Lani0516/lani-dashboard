import { Router } from 'express';
import type { VPNStatus } from '../../../../shared/types/index.js';

export const vpnRouter = Router();

vpnRouter.get('/status', async (_req, res) => {
  const placeholder: VPNStatus = {
    connected: false,
    provider: 'wireguard',
    peers: [],
  };
  res.json({ ok: true, data: placeholder, timestamp: Date.now() });
});
