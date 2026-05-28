import type { WebSocketServer } from 'ws';
import { broadcastUpdate } from './ws.js';
import { getSystemStats } from './modules/system/service.js';
import { configManager } from './config/config-manager.js';

export function startPolling(wss: WebSocketServer) {
  const poll = async () => {
    try {
      const stats = await getSystemStats();
      broadcastUpdate(wss, 'system:stats', stats);
    } catch (e) {
      console.error('Polling error:', e);
    }
  };

  const interval = configManager.get().refreshInterval || 5000;
  setInterval(poll, interval);
  poll();
}
