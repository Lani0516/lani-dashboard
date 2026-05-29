import { timingSafeEqual } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'http';

const TOKEN = process.env.DASHBOARD_TOKEN?.trim() || '';

export const authEnabled = TOKEN.length > 0;

if (!authEnabled) {
  console.warn(
    '[auth] DASHBOARD_TOKEN not set — API and terminal are UNAUTHENTICATED. ' +
      'Rely on VPN perimeter only. Set DASHBOARD_TOKEN in .env to enable the gate.'
  );
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function extractToken(req: { headers: Record<string, any>; url?: string }): string {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  const header = req.headers['x-auth-token'];
  if (typeof header === 'string') return header;
  return '';
}

export function checkToken(token: string): boolean {
  if (!authEnabled) return true;
  return safeEqual(token, TOKEN);
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!authEnabled) return next();
  if (checkToken(extractToken(req))) return next();
  res.status(401).json({ ok: false, error: 'Unauthorized', timestamp: Date.now() });
}

// Reject cross-origin WS handshakes (defends against DNS-rebinding driving the PTY).
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser client (e.g. CLI) has no Origin
  const host = req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function verifyWsUpgrade(req: IncomingMessage): boolean {
  if (!originAllowed(req)) return false;
  if (!authEnabled) return true;
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || extractToken(req);
  return checkToken(token);
}

export function authStatus() {
  return { authEnabled };
}
