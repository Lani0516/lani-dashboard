import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { promisify } from 'util';
import type { LocalSite, NginxDeployRequest, NginxDeployResult } from '../../../../shared/types/index.js';

const run = promisify(exec);

interface Listener {
  port: number;
  address: string;
  process?: string;
  pid?: number;
}

// Linux: `ss -tlnpH` - one socket per line.
function parseSs(out: string): Listener[] {
  const listeners: Listener[] = [];
  for (const line of out.split('\n')) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 4) continue;
    const local = cols[3];
    const port = Number(local.slice(local.lastIndexOf(':') + 1));
    if (!port) continue;
    const address = local.slice(0, local.lastIndexOf(':')) || '*';
    const procMatch = line.match(/users:\(\("([^"]+)",pid=(\d+)/);
    listeners.push({
      port,
      address,
      process: procMatch?.[1],
      pid: procMatch ? Number(procMatch[2]) : undefined,
    });
  }
  return listeners;
}

// macOS / BSD: `lsof -nP -iTCP -sTCP:LISTEN`.
function parseLsof(out: string): Listener[] {
  const listeners: Listener[] = [];
  const lines = out.split('\n').slice(1); // drop header
  for (const line of lines) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 9) continue;
    const name = [...cols].reverse().find((col) => /:\d+$/.test(col));
    if (!name) continue;
    const port = Number(name.slice(name.lastIndexOf(':') + 1));
    if (!port) continue;
    const address = name.slice(0, name.lastIndexOf(':')) || '*';
    listeners.push({ port, address, process: cols[0], pid: Number(cols[1]) || undefined });
  }
  return listeners;
}

async function listListeners(): Promise<Listener[]> {
  if (process.platform === 'linux') {
    const { stdout } = await run('ss -tlnpH', { timeout: 5000 });
    return parseSs(stdout);
  }
  const { stdout } = await run('lsof -nP -iTCP -sTCP:LISTEN', { timeout: 5000 });
  return parseLsof(stdout);
}

// Dedupe by port, preferring a non-loopback bind so the URL is reachable.
function dedupe(listeners: Listener[]): Listener[] {
  const byPort = new Map<number, Listener>();
  for (const l of listeners) {
    const existing = byPort.get(l.port);
    if (!existing) {
      byPort.set(l.port, l);
      continue;
    }
    const isLoopback = (a: string) => a.includes('127.0.0.1') || a === '::1' || a === '[::1]';
    if (isLoopback(existing.address) && !isLoopback(l.address)) byPort.set(l.port, l);
  }
  return [...byPort.values()].sort((a, b) => a.port - b.port);
}

function probeHosts(address: string): string[] {
  if (address === '[::1]' || address === '::1') return ['[::1]'];
  if (address.includes('127.0.0.1')) return ['127.0.0.1'];
  return ['127.0.0.1', '[::1]'];
}

async function probe(listener: Listener): Promise<Pick<LocalSite, 'proto' | 'online' | 'statusCode' | 'title'>> {
  for (const host of probeHosts(listener.address)) {
    const result = await probeHost(host, listener.port);
    if (result.online) return result;
  }
  return { proto: 'unknown', online: false };
}

async function probeHost(host: string, port: number): Promise<Pick<LocalSite, 'proto' | 'online' | 'statusCode' | 'title'>> {
  try {
    const res = await fetch(`http://${host}:${port}/`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(1000),
    });
    let title: string | undefined;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      const body = await res.text();
      title = body.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || undefined;
    }
    return { proto: 'http', online: true, statusCode: res.status, title };
  } catch {
    return { proto: 'unknown', online: false };
  }
}

export async function getLocalSites(): Promise<LocalSite[]> {
  const listeners = dedupe(await listListeners());
  const sites = await Promise.all(
    listeners.map(async (l) => ({ ...l, ...(await probe(l)) }))
  );
  return sites.filter((site) => site.statusCode === 200);
}

function cleanName(name: string): string {
  const safe = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!safe) throw new Error('Site name is required');
  return safe;
}

function cleanServerName(serverName: string): string {
  const safe = serverName.trim();
  if (!safe || /[;\s{}]/.test(safe)) throw new Error('Invalid server name');
  return safe;
}

function cleanPort(port: number, label: string): number {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid ${label}`);
  return port;
}

function cleanRoot(root: string): string {
  const safe = root.trim();
  if (!safe || /[\n\r;]/.test(safe)) throw new Error('Invalid root path');
  return safe;
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function nginxTarget(name: string): Promise<{ configPath: string; enabledPath?: string; active: boolean }> {
  const configDir = process.env.NGINX_CONFIG_DIR?.trim();
  if (configDir) return { configPath: join(configDir, `${name}.conf`), active: true };

  const availableDir = process.env.NGINX_SITES_AVAILABLE?.trim() || '/etc/nginx/sites-available';
  const enabledDir = process.env.NGINX_SITES_ENABLED?.trim() || '/etc/nginx/sites-enabled';
  if (process.platform === 'linux' && await exists(availableDir)) {
    return { configPath: join(availableDir, name), enabledPath: join(enabledDir, name), active: true };
  }

  for (const dir of ['/opt/homebrew/etc/nginx/servers', '/usr/local/etc/nginx/servers']) {
    if (await exists(dir)) return { configPath: join(dir, `${name}.conf`), active: true };
  }

  return { configPath: join(process.cwd(), 'data', 'nginx-sites', `${name}.conf`), active: false };
}

function nginxConfig(input: Required<NginxDeployRequest>): string {
  const accessLog = `/var/log/nginx/${input.name}.access.log`;
  const errorLog = `/var/log/nginx/${input.name}.error.log`;
  const body = input.mode === 'proxy'
    ? [
        `    location / {`,
        `        proxy_pass http://127.0.0.1:${input.upstreamPort};`,
        `        proxy_http_version 1.1;`,
        `        proxy_set_header Host $host;`,
        `        proxy_set_header X-Real-IP $remote_addr;`,
        `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
        `        proxy_set_header X-Forwarded-Proto $scheme;`,
        `        proxy_set_header Upgrade $http_upgrade;`,
        `        proxy_set_header Connection "upgrade";`,
        `    }`,
      ]
    : [
        `    root ${input.root};`,
        `    index index.html;`,
        ``,
        `    location / {`,
        `        try_files $uri $uri/ /index.html;`,
        `    }`,
      ];

  return [
    `server {`,
    `    listen ${input.listenPort};`,
    `    server_name ${input.serverName};`,
    `    access_log ${accessLog};`,
    `    error_log ${errorLog};`,
    ``,
    ...body,
    `}`,
    ``,
  ].join('\n');
}

async function tryRun(command: string): Promise<string | undefined> {
  try {
    await run(command, { timeout: 10000 });
    return undefined;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function deployNginxSite(req: NginxDeployRequest): Promise<NginxDeployResult> {
  const name = cleanName(req.name);
  const serverName = cleanServerName(req.serverName || '_');
  const listenPort = cleanPort(Number(req.listenPort), 'listen port');
  const mode = req.mode === 'static' ? 'static' : 'proxy';
  const upstreamPort = mode === 'proxy' ? cleanPort(Number(req.upstreamPort), 'upstream port') : 0;
  const root = mode === 'static' ? cleanRoot(req.root || join(homedir(), 'Sites', name)) : '';
  const target = await nginxTarget(name);
  const warnings: string[] = [];

  await fs.mkdir(dirname(target.configPath), { recursive: true });
  if (root) {
    await fs.mkdir(root, { recursive: true });
    const indexPath = join(root, 'index.html');
    if (!await exists(indexPath)) {
      await fs.writeFile(indexPath, `<h1>${name}</h1>\n`, 'utf-8');
    }
  }

  await fs.writeFile(
    target.configPath,
    nginxConfig({ name, serverName, listenPort, mode, upstreamPort, root }),
    'utf-8'
  );

  if (target.enabledPath && !await exists(target.enabledPath)) {
    try {
      await fs.symlink(target.configPath, target.enabledPath);
    } catch (e) {
      warnings.push(`Enable symlink failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!target.active) {
    warnings.push('No nginx config include dir detected. Set NGINX_CONFIG_DIR or NGINX_SITES_AVAILABLE/NGINX_SITES_ENABLED.');
  }
  const testError = target.active ? await tryRun('nginx -t') : 'Skipped nginx -t because config is a draft';
  if (target.active && testError) warnings.push(`nginx -t failed: ${testError}`);
  const reloadError = target.active && !testError ? await tryRun('nginx -s reload') : 'Skipped reload because nginx -t failed';
  if (target.active && reloadError) warnings.push(reloadError);

  return {
    configPath: target.configPath,
    enabledPath: target.enabledPath,
    root: root || undefined,
    tested: target.active && !testError,
    reloaded: target.active && !testError && !reloadError,
    warnings,
    url: `http://${serverName === '_' ? 'localhost' : serverName}:${listenPort}`,
  };
}
