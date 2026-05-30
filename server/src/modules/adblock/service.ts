import type { AdblockStats } from '../../../../shared/types/index.js';

function normalizeBase(host: string): string {
  let base = host.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
  return base;
}

// Pi-hole v5: /admin/api.php?summaryRaw&auth=<token>
async function fetchV5(base: string, token: string): Promise<AdblockStats> {
  const url = `${base}/admin/api.php?summaryRaw&auth=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Pi-hole responded ${res.status}`);
  const d = await res.json();
  // When auth fails, v5 returns [] instead of an object.
  if (Array.isArray(d) || typeof d !== 'object' || d === null) {
    throw new Error('Auth failed — check API token');
  }
  return {
    online: true,
    version: 'v5',
    queriesToday: Number(d.dns_queries_today) || 0,
    blockedToday: Number(d.ads_blocked_today) || 0,
    blockPercent: Number(d.ads_percentage_today) || 0,
    domainsOnBlocklist: Number(d.domains_being_blocked) || 0,
    blockingEnabled: d.status === 'enabled',
  };
}

// Pi-hole v6: POST /api/auth -> sid, then GET /api/stats/summary
async function fetchV6(base: string, password: string): Promise<AdblockStats> {
  const authRes = await fetch(`${base}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(5000),
  });
  if (!authRes.ok) throw new Error(`Auth failed — ${authRes.status}`);
  const auth = await authRes.json();
  const sid: string | undefined = auth?.session?.sid;
  if (!auth?.session?.valid || !sid) throw new Error('Auth failed — check password');

  try {
    const res = await fetch(`${base}/api/stats/summary`, {
      headers: { 'X-FTL-SID': sid },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Pi-hole responded ${res.status}`);
    const d = await res.json();
    const q = d.queries ?? {};
    return {
      online: true,
      version: 'v6',
      queriesToday: Number(q.total) || 0,
      blockedToday: Number(q.blocked) || 0,
      blockPercent: Number(q.percent_blocked) || 0,
      domainsOnBlocklist: Number(d.gravity?.domains_being_blocked) || 0,
      blockingEnabled: true,
    };
  } finally {
    // Release the session so we don't exhaust Pi-hole's session slots.
    fetch(`${base}/api/auth`, {
      method: 'DELETE',
      headers: { 'X-FTL-SID': sid },
    }).catch(() => {});
  }
}

export async function getAdblockStats(
  host: string,
  version: 'v5' | 'v6',
  token: string
): Promise<AdblockStats> {
  const base = normalizeBase(host);
  return version === 'v6' ? fetchV6(base, token) : fetchV5(base, token);
}
