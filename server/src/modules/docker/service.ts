import http from 'node:http';
import fs from 'node:fs';
import type {
  DockerStatus,
  DockerContainer,
  DockerImage,
  DockerVolume,
} from '../../../../shared/types/index.js';

const SOCKET_PATH = '/var/run/docker.sock';
const API_VERSION = 'v1.43';

function socketAvailable(): boolean {
  try {
    fs.accessSync(SOCKET_PATH, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

interface DockerRequestOptions {
  method?: string;
  // When true, resolve with the raw Buffer instead of parsed JSON.
  raw?: boolean;
  timeoutMs?: number;
}

// Low-level request against the Docker Engine API over the unix socket.
function dockerRequest<T = any>(path: string, opts: DockerRequestOptions = {}): Promise<T> {
  const { method = 'GET', raw = false, timeoutMs = 8000 } = opts;
  return new Promise<T>((resolve, reject) => {
    const req = http.request(
      {
        socketPath: SOCKET_PATH,
        path: `/${API_VERSION}${path}`,
        method,
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c as Buffer));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const status = res.statusCode || 0;
          if (status < 200 || status >= 300) {
            let msg = `Docker API ${status}`;
            try {
              const parsed = JSON.parse(buf.toString('utf8'));
              if (parsed?.message) msg = parsed.message;
            } catch {
              if (buf.length) msg = buf.toString('utf8').slice(0, 200);
            }
            return reject(new Error(msg));
          }
          if (raw) return resolve(buf as unknown as T);
          if (buf.length === 0) return resolve(undefined as unknown as T);
          try {
            resolve(JSON.parse(buf.toString('utf8')) as T);
          } catch (e) {
            reject(new Error(`Invalid JSON from Docker: ${String(e)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Docker request timed out'));
    });
    req.end();
  });
}

const unavailable: DockerStatus = { available: false, containers: [] };

function shortName(names: string[] | undefined): string {
  const n = names?.[0] || '';
  return n.replace(/^\//, '');
}

// Compute CPU% the same way the docker CLI does, from a stats sample.
function computeCpuPercent(stats: any): number {
  try {
    const cpu = stats.cpu_stats;
    const pre = stats.precpu_stats;
    const cpuDelta = cpu.cpu_usage.total_usage - (pre?.cpu_usage?.total_usage || 0);
    const sysDelta = cpu.system_cpu_usage - (pre?.system_cpu_usage || 0);
    const onlineCpus =
      cpu.online_cpus || cpu.cpu_usage?.percpu_usage?.length || 1;
    if (sysDelta > 0 && cpuDelta > 0) {
      return Math.round(((cpuDelta / sysDelta) * onlineCpus * 100) * 10) / 10;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function computeMem(stats: any): { memUsage: number; memLimit: number } {
  try {
    const m = stats.memory_stats || {};
    // Exclude cache from usage as docker CLI does.
    const cache = m.stats?.cache ?? m.stats?.inactive_file ?? 0;
    const usage = Math.max(0, (m.usage || 0) - cache);
    return { memUsage: usage, memLimit: m.limit || 0 };
  } catch {
    return { memUsage: 0, memLimit: 0 };
  }
}

async function getContainerStats(id: string): Promise<{ cpuPercent: number; memUsage: number; memLimit: number }> {
  try {
    const stats = await dockerRequest<any>(`/containers/${id}/stats?stream=false`, { timeoutMs: 6000 });
    const { memUsage, memLimit } = computeMem(stats);
    return { cpuPercent: computeCpuPercent(stats), memUsage, memLimit };
  } catch {
    return { cpuPercent: 0, memUsage: 0, memLimit: 0 };
  }
}

export async function getDockerStatus(): Promise<DockerStatus> {
  if (!socketAvailable()) return unavailable;
  try {
    const raw = await dockerRequest<any[]>('/containers/json?all=1');
    const list = Array.isArray(raw) ? raw : [];
    // Only sample live stats for running containers (stats on stopped ones hang/return zeros).
    const containers: DockerContainer[] = await Promise.all(
      list.map(async (c): Promise<DockerContainer> => {
        const id: string = c.Id;
        const running = c.State === 'running';
        const stats = running
          ? await getContainerStats(id)
          : { cpuPercent: 0, memUsage: 0, memLimit: 0 };
        return {
          id,
          name: shortName(c.Names),
          image: c.Image || '',
          state: c.State || 'unknown',
          status: c.Status || '',
          cpuPercent: stats.cpuPercent,
          memUsage: stats.memUsage,
          memLimit: stats.memLimit,
        };
      })
    );
    containers.sort((a, b) => a.name.localeCompare(b.name));
    return { available: true, containers };
  } catch (e) {
    return { available: false, error: String(e instanceof Error ? e.message : e), containers: [] };
  }
}

export async function startContainer(id: string): Promise<void> {
  await dockerRequest(`/containers/${encodeURIComponent(id)}/start`, { method: 'POST' });
}

export async function stopContainer(id: string): Promise<void> {
  await dockerRequest(`/containers/${encodeURIComponent(id)}/stop`, { method: 'POST', timeoutMs: 20000 });
}

export async function restartContainer(id: string): Promise<void> {
  await dockerRequest(`/containers/${encodeURIComponent(id)}/restart`, { method: 'POST', timeoutMs: 20000 });
}

// Logs are a multiplexed stream: each frame is an 8-byte header
// [STREAM_TYPE, 0,0,0, SIZE(uint32 BE)] followed by SIZE bytes of payload.
function demuxLogs(buf: Buffer): string {
  const out: string[] = [];
  let offset = 0;
  // Detect whether the stream is multiplexed. TTY-enabled containers send raw bytes.
  const looksMultiplexed = buf.length >= 8 && buf[0] <= 2 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
  if (!looksMultiplexed) return buf.toString('utf8');
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4);
    offset += 8;
    if (offset + size > buf.length) {
      out.push(buf.toString('utf8', offset));
      break;
    }
    out.push(buf.toString('utf8', offset, offset + size));
    offset += size;
  }
  return out.join('');
}

export async function getContainerLogs(id: string, tail = 200): Promise<string> {
  const buf = await dockerRequest<Buffer>(
    `/containers/${encodeURIComponent(id)}/logs?stdout=1&stderr=1&tail=${encodeURIComponent(String(tail))}`,
    { raw: true }
  );
  return demuxLogs(buf);
}

export async function getImages(): Promise<{ available: boolean; images: DockerImage[]; error?: string }> {
  if (!socketAvailable()) return { available: false, images: [] };
  try {
    const raw = await dockerRequest<any[]>('/images/json');
    const list = Array.isArray(raw) ? raw : [];
    const images: DockerImage[] = list.map((img): DockerImage => {
      const tags: string[] = img.RepoTags && img.RepoTags.length ? img.RepoTags : ['<none>:<none>'];
      return {
        id: img.Id,
        tag: tags[0],
        tags,
        size: img.Size || 0,
      };
    });
    return { available: true, images };
  } catch (e) {
    return { available: false, images: [], error: String(e instanceof Error ? e.message : e) };
  }
}

export async function pruneImages(): Promise<{ reclaimed: number }> {
  // Prune only dangling (unused) images.
  const res = await dockerRequest<any>('/images/prune', { method: 'POST', timeoutMs: 30000 });
  return { reclaimed: res?.SpaceReclaimed || 0 };
}

export async function getVolumes(): Promise<{ available: boolean; volumes: DockerVolume[]; error?: string }> {
  if (!socketAvailable()) return { available: false, volumes: [] };
  try {
    const res = await dockerRequest<any>('/volumes');
    const list = Array.isArray(res?.Volumes) ? res.Volumes : [];
    const volumes: DockerVolume[] = list.map((v: any): DockerVolume => ({
      name: v.Name,
      mountpoint: v.Mountpoint || '',
      driver: v.Driver || '',
    }));
    return { available: true, volumes };
  } catch (e) {
    return { available: false, volumes: [], error: String(e instanceof Error ? e.message : e) };
  }
}
