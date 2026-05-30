import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import type {
  UptimeTarget,
  UptimeProbeResult,
  UptimeStatus,
} from '../../../../shared/types/index.js';

const DATA_PATH = join(process.cwd(), 'data', 'uptime.json');
const HISTORY_CAP = 50;
const PROBE_INTERVAL = 30_000;

let targets: UptimeTarget[] = [];
const history = new Map<string, UptimeProbeResult[]>();
let timer: ReturnType<typeof setInterval> | null = null;

// ── Persistence ──
async function load(): Promise<void> {
  try {
    const raw = await readFile(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    targets = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.targets) ? parsed.targets : [];
  } catch {
    targets = [];
    await persist();
  }
}

async function persist(): Promise<void> {
  await mkdir(dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, JSON.stringify({ targets }, null, 2));
}

function pushResult(id: string, result: UptimeProbeResult): void {
  const buf = history.get(id) ?? [];
  buf.push(result);
  while (buf.length > HISTORY_CAP) buf.shift();
  history.set(id, buf);
}

// ── Probes ──
async function probeHttp(target: UptimeTarget): Promise<UptimeProbeResult> {
  const start = Date.now();
  let url = target.target.trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });
    const latencyMs = Date.now() - start;
    const up = target.expectedStatus
      ? res.status === target.expectedStatus
      : res.status >= 200 && res.status < 400;
    return {
      timestamp: Date.now(),
      up,
      latencyMs,
      ...(up ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    return {
      timestamp: Date.now(),
      up: false,
      latencyMs: Date.now() - start,
      error: String(e instanceof Error ? e.message : e),
    };
  }
}

function parseHostPort(raw: string, defaultPort = 0): { host: string; port: number } {
  let s = raw.trim().replace(/^[a-z]+:\/\//i, '');
  const idx = s.lastIndexOf(':');
  if (idx > -1) {
    const port = Number(s.slice(idx + 1));
    if (!Number.isNaN(port)) return { host: s.slice(0, idx), port };
  }
  return { host: s, port: defaultPort };
}

function probeTcp(target: UptimeTarget): Promise<UptimeProbeResult> {
  const start = Date.now();
  const { host, port } = parseHostPort(target.target);
  return new Promise((resolve) => {
    if (!port) {
      resolve({
        timestamp: Date.now(),
        up: false,
        latencyMs: 0,
        error: 'host:port required for tcp',
      });
      return;
    }
    const socket = net.connect({ host, port });
    let done = false;
    const finish = (up: boolean, error?: string) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({
        timestamp: Date.now(),
        up,
        latencyMs: Date.now() - start,
        ...(error ? { error } : {}),
      });
    };
    socket.setTimeout(5000);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, 'connection timed out'));
    socket.once('error', (err) => finish(false, String(err.message)));
  });
}

function probePing(target: UptimeTarget): Promise<UptimeProbeResult> {
  const start = Date.now();
  const { host } = parseHostPort(target.target);
  return new Promise((resolve) => {
    let child;
    try {
      // -c1 one packet, -W2 wait 2s (linux/mac compatible)
      child = spawn('ping', ['-c1', '-W2', host]);
    } catch (e) {
      resolve({
        timestamp: Date.now(),
        up: false,
        latencyMs: 0,
        error: 'ping unavailable',
      });
      return;
    }
    let out = '';
    let settled = false;
    const kill = setTimeout(() => child!.kill(), 6000);
    child.stdout?.on('data', (d) => (out += d.toString()));
    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(kill);
      resolve({ timestamp: Date.now(), up: false, latencyMs: 0, error: 'ping unavailable' });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(kill);
      const m = out.match(/time[=<]\s*([\d.]+)\s*ms/i);
      const latencyMs = m ? Math.round(parseFloat(m[1])) : Date.now() - start;
      const up = code === 0;
      resolve({
        timestamp: Date.now(),
        up,
        latencyMs,
        ...(up ? {} : { error: 'host unreachable' }),
      });
    });
  });
}

async function probe(target: UptimeTarget): Promise<UptimeProbeResult> {
  switch (target.type) {
    case 'tcp':
      return probeTcp(target);
    case 'ping':
      return probePing(target);
    case 'http':
    default:
      return probeHttp(target);
  }
}

async function probeAll(): Promise<void> {
  await Promise.all(
    targets.map(async (t) => {
      const result = await probe(t);
      pushResult(t.id, result);
    })
  );
}

// ── Accessors ──
export function getStatus(): UptimeStatus[] {
  return targets.map((t) => {
    const hist = history.get(t.id) ?? [];
    const last = hist[hist.length - 1];
    const ups = hist.filter((h) => h.up).length;
    const uptimePercent = hist.length ? (ups / hist.length) * 100 : 0;
    return {
      ...t,
      up: last ? last.up : false,
      latencyMs: last ? last.latencyMs : null,
      lastError: last?.error,
      uptimePercent: Math.round(uptimePercent * 10) / 10,
      history: hist,
    };
  });
}

export async function addTarget(input: Omit<UptimeTarget, 'id'>): Promise<UptimeTarget> {
  const target: UptimeTarget = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: input.label,
    type: input.type,
    target: input.target,
    ...(input.expectedStatus ? { expectedStatus: input.expectedStatus } : {}),
  };
  targets.push(target);
  history.set(target.id, []);
  await persist();
  // Kick off an immediate probe so the UI updates promptly.
  probe(target).then((r) => pushResult(target.id, r)).catch(() => {});
  return target;
}

export async function removeTarget(id: string): Promise<void> {
  targets = targets.filter((t) => t.id !== id);
  history.delete(id);
  await persist();
}

export async function startUptimeMonitor(): Promise<void> {
  await load();
  for (const t of targets) if (!history.has(t.id)) history.set(t.id, []);
  await probeAll();
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    probeAll().catch(() => {});
  }, PROBE_INTERVAL);
}
