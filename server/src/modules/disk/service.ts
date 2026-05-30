import { readFile, readdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import type {
  DiskStats,
  DiskMount,
  DiskSmart,
  DiskIo,
} from '../../../../shared/types/index.js';

const execAsync = promisify(exec);

// Run a command with a timeout; never throw — return null on any failure.
async function safeExec(cmd: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: timeoutMs });
    return stdout;
  } catch {
    return null;
  }
}

const SKIP_FS = new Set([
  'tmpfs',
  'devtmpfs',
  'devfs',
  'overlay',
  'squashfs',
  'proc',
  'sysfs',
  'cgroup',
  'cgroup2',
  'autofs',
  'mqueue',
  'debugfs',
  'tracefs',
  'fusectl',
  'configfs',
  'ramfs',
  'nsfs',
  'binfmt_misc',
  'pstore',
  'efivarfs',
  'securityfs',
  'bpf',
]);

// Skip pseudo / virtual mount points that aren't real storage.
function isUsefulMount(mount: string): boolean {
  if (!mount) return false;
  const skipPrefixes = ['/proc', '/sys', '/dev', '/run', '/snap'];
  return !skipPrefixes.some((p) => mount === p || mount.startsWith(p + '/'));
}

// Parse `df -kP` (POSIX, 1K blocks). On linux we ask for filesystem type too.
async function getMounts(): Promise<DiskMount[]> {
  const linux = process.platform === 'linux';
  // -T (type) is GNU-only; df on mac lacks it. Try -T first on linux.
  const cmd = linux ? 'df -kPT' : 'df -kP';
  const out = await safeExec(cmd);
  if (!out) {
    // Fallback without -T if the typed variant failed for some reason.
    const fb = await safeExec('df -kP');
    if (!fb) return [];
    return parseDf(fb, false);
  }
  return parseDf(out, linux);
}

function parseDf(out: string, hasType: boolean): DiskMount[] {
  const lines = out.trim().split('\n').slice(1);
  const mounts: DiskMount[] = [];
  for (const line of lines) {
    const f = line.trim().split(/\s+/);
    // With -T: Filesystem Type 1024-blocks Used Available Capacity Mounted-on
    // Without:  Filesystem      1024-blocks Used Available Capacity Mounted-on
    if (hasType) {
      if (f.length < 7) continue;
      const fsType = f[1];
      if (SKIP_FS.has(fsType)) continue;
      const total = Number(f[2]) * 1024;
      const used = Number(f[3]) * 1024;
      const avail = Number(f[4]) * 1024;
      const mount = f.slice(6).join(' ');
      if (!isUsefulMount(mount)) continue;
      if (!Number.isFinite(total) || total <= 0) continue;
      mounts.push({
        mount,
        fsType,
        totalBytes: total,
        usedBytes: used,
        availBytes: avail,
        usePercent: total > 0 ? Math.round((used / total) * 100) : 0,
      });
    } else {
      if (f.length < 6) continue;
      const total = Number(f[1]) * 1024;
      const used = Number(f[2]) * 1024;
      const avail = Number(f[3]) * 1024;
      const mount = f.slice(5).join(' ');
      if (!isUsefulMount(mount)) continue;
      if (!Number.isFinite(total) || total <= 0) continue;
      mounts.push({
        mount,
        totalBytes: total,
        usedBytes: used,
        availBytes: avail,
        usePercent: total > 0 ? Math.round((used / total) * 100) : 0,
      });
    }
  }
  return mounts;
}

// Parse `df -iP` and merge inode info onto matching mounts.
async function mergeInodes(mounts: DiskMount[]): Promise<void> {
  const out = await safeExec('df -iP');
  if (!out) return;
  const byMount = new Map(mounts.map((m) => [m.mount, m]));
  const lines = out.trim().split('\n').slice(1);
  for (const line of lines) {
    const f = line.trim().split(/\s+/);
    // Filesystem Inodes IUsed IFree IUse% Mounted-on
    if (f.length < 6) continue;
    const mount = f.slice(5).join(' ');
    const target = byMount.get(mount);
    if (!target) continue;
    const total = Number(f[1]);
    const used = Number(f[2]);
    if (!Number.isFinite(total) || total <= 0) continue;
    target.inodesTotal = total;
    target.inodesUsed = used;
    target.inodesPercent = total > 0 ? Math.round((used / total) * 100) : 0;
  }
}

// Discover physical disks via /sys/block, falling back to lsblk.
async function listDisks(): Promise<string[]> {
  const match = (n: string) =>
    /^(sd[a-z]+|nvme\d+n\d+|vd[a-z]+|mmcblk\d+|hd[a-z]+)$/.test(n);
  if (process.platform === 'linux') {
    try {
      const names = await readdir('/sys/block');
      const disks = names.filter(match);
      if (disks.length) return disks;
    } catch {}
    const out = await safeExec('lsblk -dno NAME');
    if (out) {
      return out
        .trim()
        .split('\n')
        .map((s) => s.trim())
        .filter(match);
    }
  }
  return [];
}

// SMART health. Feature-detected: returns { available:false } if smartctl
// is missing or any device fails — never throws.
async function getSmart(): Promise<DiskSmart> {
  if (process.platform !== 'linux') return { available: false };
  const which = await safeExec('command -v smartctl');
  if (!which || !which.trim()) return { available: false };

  const disks = await listDisks();
  if (!disks.length) return { available: false };

  const devices: NonNullable<DiskSmart['devices']> = [];
  for (const disk of disks) {
    const out = await safeExec(`smartctl -H -A -j /dev/${disk}`, 6000);
    if (!out) continue;
    let json: any;
    try {
      json = JSON.parse(out);
    } catch {
      continue;
    }
    if (!json || typeof json !== 'object') continue;
    const healthPassed = json.smart_status?.passed;
    if (typeof healthPassed !== 'boolean') continue; // no usable health info
    const tempC =
      typeof json.temperature?.current === 'number'
        ? json.temperature.current
        : undefined;
    let powerOnHours: number | undefined;
    if (typeof json.power_on_time?.hours === 'number') {
      powerOnHours = json.power_on_time.hours;
    }
    devices.push({ device: disk, healthPassed, tempC, powerOnHours });
  }

  if (!devices.length) return { available: false };
  return { available: true, devices };
}

// Read /proc/diskstats; map device -> { readSectors, writeSectors }.
async function readDiskstats(): Promise<Map<string, { read: number; write: number }>> {
  const map = new Map<string, { read: number; write: number }>();
  try {
    const content = await readFile('/proc/diskstats', 'utf8');
    for (const line of content.split('\n')) {
      const f = line.trim().split(/\s+/);
      // 3:name 6:sectors read 10:sectors written
      if (f.length < 14) continue;
      const name = f[2];
      // Only top-level physical disks, skip partitions/loop/ram.
      if (!/^(sd[a-z]+|nvme\d+n\d+|vd[a-z]+|mmcblk\d+|hd[a-z]+)$/.test(name)) continue;
      map.set(name, { read: Number(f[5]) || 0, write: Number(f[9]) || 0 });
    }
  } catch {}
  return map;
}

// Two reads ~1s apart -> per-device bytes/sec (sectors * 512).
async function getIo(): Promise<DiskIo[]> {
  if (process.platform !== 'linux') return [];
  const first = await readDiskstats();
  if (!first.size) return [];
  await new Promise((r) => setTimeout(r, 1000));
  const second = await readDiskstats();
  const t = 1; // seconds (approx)
  const result: DiskIo[] = [];
  for (const [device, b] of second) {
    const a = first.get(device);
    if (!a) continue;
    const readDelta = b.read - a.read;
    const writeDelta = b.write - a.write;
    result.push({
      device,
      readBps: readDelta >= 0 ? Math.round((readDelta * 512) / t) : 0,
      writeBps: writeDelta >= 0 ? Math.round((writeDelta * 512) / t) : 0,
    });
  }
  return result;
}

// Top-level: always resolves ok with whatever subset succeeded.
export async function getDiskStats(): Promise<DiskStats> {
  const mounts = await getMounts().catch(() => [] as DiskMount[]);
  const [, smart, io] = await Promise.all([
    mergeInodes(mounts).catch(() => {}),
    getSmart().catch((): DiskSmart => ({ available: false })),
    getIo().catch((): DiskIo[] => []),
  ]);

  return {
    mounts,
    smart,
    io,
    timestamp: Date.now(),
  };
}
