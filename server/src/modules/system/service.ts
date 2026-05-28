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

function getNetworkStats(): NetworkInterface[] {
  const ifaces = networkInterfaces();
  const now = Date.now();
  const result: NetworkInterface[] = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs || name === 'lo' || name === 'lo0') continue;
    const hasIPv4 = addrs.some(a => a.family === 'IPv4' && !a.internal);
    if (!hasIPv4) continue;

    const prev = prevNetStats.get(name);
    const iface: NetworkInterface = {
      name,
      rxBytes: 0,
      txBytes: 0,
      rxSpeed: 0,
      txSpeed: 0,
    };

    if (prev) {
      const elapsed = (now - prev.time) / 1000;
      iface.rxSpeed = elapsed > 0 ? Math.round((iface.rxBytes - prev.rx) / elapsed) : 0;
      iface.txSpeed = elapsed > 0 ? Math.round((iface.txBytes - prev.tx) / elapsed) : 0;
    }

    prevNetStats.set(name, { rx: iface.rxBytes, tx: iface.txBytes, time: now });
    result.push(iface);
  }

  return result;
}

export async function getSystemStats(): Promise<SystemStats> {
  const [cpuUsage, cpuTemp] = await Promise.all([getCpuUsage(), getCpuTemp()]);
  const cpuInfo = cpus();
  const interfaces = getNetworkStats();

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
