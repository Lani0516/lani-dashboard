import { readFile } from 'fs/promises';
import { cpus, totalmem, freemem, uptime, loadavg, networkInterfaces } from 'os';
import type { SystemStats, NetworkInterface, ConnectedDevice } from '../../../../shared/types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let prevNetStats: Map<string, { rx: number; tx: number; time: number }> = new Map();

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const start = cpus();
    setTimeout(() => {
      const end = cpus();
      let idleDiff = 0;
      let totalDiff = 0;
      for (let i = 0; i < start.length; i++) {
        const startTotal = Object.values(start[i].times).reduce((a, b) => a + b, 0);
        const endTotal = Object.values(end[i].times).reduce((a, b) => a + b, 0);
        idleDiff += end[i].times.idle - start[i].times.idle;
        totalDiff += endTotal - startTotal;
      }
      resolve(totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100));
    }, 500);
  });
}

async function getCpuTemp(): Promise<number | undefined> {
  try {
    const { stdout } = await execAsync(
      'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || sysctl -n machdep.xcpm.cpu_thermal_level 2>/dev/null'
    );
    const val = parseInt(stdout.trim());
    return val > 1000 ? val / 1000 : val;
  } catch {
    return undefined;
  }
}

// Read cumulative rx/tx byte counters per interface from the OS.
async function readByteCounters(): Promise<Map<string, { rx: number; tx: number }>> {
  const counters = new Map<string, { rx: number; tx: number }>();

  if (process.platform === 'linux') {
    try {
      const content = await readFile('/proc/net/dev', 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([^:]+):\s+(.*)$/);
        if (!m) continue;
        const name = m[1].trim();
        const cols = m[2].trim().split(/\s+/).map(Number);
        // cols: rxBytes(0) ... txBytes(8)
        counters.set(name, { rx: cols[0] || 0, tx: cols[8] || 0 });
      }
    } catch {}
  } else {
    // macOS / BSD: netstat -ib. Use the <Link#> row which carries full byte totals.
    try {
      const { stdout } = await execAsync('netstat -ibn 2>/dev/null');
      for (const line of stdout.split('\n')) {
        const f = line.trim().split(/\s+/);
        if (f.length < 11 || !f[2]?.startsWith('<Link')) continue;
        // 0 name,1 mtu,2 network,3 address,4 ipkts,5 ierrs,6 ibytes,7 opkts,8 oerrs,9 obytes
        counters.set(f[0], { rx: Number(f[6]) || 0, tx: Number(f[9]) || 0 });
      }
    } catch {}
  }

  return counters;
}

async function getNetworkStats(): Promise<NetworkInterface[]> {
  const ifaces = networkInterfaces();
  const counters = await readByteCounters();
  const now = Date.now();
  const result: NetworkInterface[] = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs || name === 'lo' || name === 'lo0') continue;
    const hasIPv4 = addrs.some(a => a.family === 'IPv4' && !a.internal);
    if (!hasIPv4) continue;

    const c = counters.get(name) ?? { rx: 0, tx: 0 };
    const prev = prevNetStats.get(name);
    const iface: NetworkInterface = {
      name,
      rxBytes: c.rx,
      txBytes: c.tx,
      rxSpeed: 0,
      txSpeed: 0,
    };

    if (prev) {
      const elapsed = (now - prev.time) / 1000;
      // guard against counter reset/wrap (negative delta)
      const rxDelta = c.rx - prev.rx;
      const txDelta = c.tx - prev.tx;
      iface.rxSpeed = elapsed > 0 && rxDelta >= 0 ? Math.round(rxDelta / elapsed) : 0;
      iface.txSpeed = elapsed > 0 && txDelta >= 0 ? Math.round(txDelta / elapsed) : 0;
    }

    prevNetStats.set(name, { rx: c.rx, tx: c.tx, time: now });
    result.push(iface);
  }

  return result;
}

export async function getSystemStats(): Promise<SystemStats> {
  const [cpuUsage, cpuTemp, interfaces] = await Promise.all([getCpuUsage(), getCpuTemp(), getNetworkStats()]);
  const cpuInfo = cpus();

  return {
    cpu: {
      usage: cpuUsage,
      cores: cpuInfo.length,
      model: cpuInfo[0]?.model || 'Unknown',
      temp: cpuTemp,
    },
    memory: {
      total: totalmem(),
      used: totalmem() - freemem(),
      free: freemem(),
    },
    network: {
      interfaces,
      totalRx: interfaces.reduce((sum, i) => sum + i.rxBytes, 0),
      totalTx: interfaces.reduce((sum, i) => sum + i.txBytes, 0),
    },
    uptime: uptime(),
    loadAvg: loadavg() as [number, number, number],
    timestamp: Date.now(),
  };
}

export async function getConnectedDevices(): Promise<ConnectedDevice[]> {
  try {
    const { stdout } = await execAsync('arp -a 2>/dev/null');
    return stdout
      .split('\n')
      .filter(line => line.includes('('))
      .map(line => {
        const ipMatch = line.match(/\(([^)]+)\)/);
        const macMatch = line.match(/at\s+([0-9a-fA-F:.-]+)/);
        const hostMatch = line.match(/^(\S+)/);
        return {
          ip: ipMatch?.[1] || '',
          mac: macMatch?.[1] || '',
          hostname: hostMatch?.[1] !== '?' ? hostMatch?.[1] : undefined,
          online: !line.includes('incomplete'),
          lastSeen: Date.now(),
        };
      })
      .filter(d => d.ip && d.mac);
  } catch {
    return [];
  }
}
