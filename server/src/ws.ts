import type { WebSocketServer } from 'ws';

export function broadcastUpdate(wss: WebSocketServer, type: string, data: unknown) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
