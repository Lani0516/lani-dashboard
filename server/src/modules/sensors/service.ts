import { readFile, readdir } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { SensorsStats, CpuTemp, HwmonReading, ThrottleStatus } from '../../../../shared/types/index.js';

const execAsync = promisify(exec);

// CPU temperature via /sys/class/thermal/thermal_zone*/temp (milli-°C) plus a
// Raspberry Pi `vcgencmd measure_temp` fallback. Each source is optional.
async function getCpuTemps(): Promise<CpuTemp[]> {
  const temps: CpuTemp[] = [];

  try {
    const entries = await readdir('/sys/class/thermal');
    const zones = entries.filter((e) => /^thermal_zone\d+$/.test(e)).sort();
    for (const zone of zones) {
      const base = `/sys/class/thermal/${zone}`;
      try {
        const raw = await readFile(`${base}/temp`, 'utf8');
        const milli = parseInt(raw.trim(), 10);
        if (!Number.isFinite(milli)) continue;
        let type = zone;
        try {
          type = (await readFile(`${base}/type`, 'utf8')).trim() || zone;
        } catch {}
        temps.push({ zone, type, value: Math.round((milli / 1000) * 10) / 10 });
      } catch {}
    }
  } catch {}

  // Raspberry Pi fallback — only if no thermal zones were readable.
  if (temps.length === 0) {
    try {
      const { stdout } = await execAsync('vcgencmd measure_temp', {
        timeout: 4000,
      });
      const m = stdout.match(/temp=([\d.]+)/);
      if (m) {
        temps.push({ zone: 'vcgencmd', type: 'cpu', value: parseFloat(m[1]) });
      }
    } catch {}
  }

  return temps;
}

// hwmon sensors: walk /sys/class/hwmon/hwmon*/ reading tempN_input (milli-°C)
// and fanN_input (RPM), with optional labels. Produces a flat list.
async function getHwmon(): Promise<HwmonReading[]> {
  const readings: HwmonReading[] = [];

  let chips: string[];
  try {
    chips = (await readdir('/sys/class/hwmon')).filter((e) => /^hwmon\d+$/.test(e)).sort();
  } catch {
    return readings;
  }

  for (const chipDir of chips) {
    const base = `/sys/class/hwmon/${chipDir}`;
    let chip = chipDir;
    try {
      chip = (await readFile(`${base}/name`, 'utf8')).trim() || chipDir;
    } catch {}

    let files: string[];
    try {
      files = await readdir(base);
    } catch {
      continue;
    }

    for (const file of files.sort()) {
      const tempM = file.match(/^temp(\d+)_input$/);
      const fanM = file.match(/^fan(\d+)_input$/);
      if (!tempM && !fanM) continue;

      let raw: string;
      try {
        raw = await readFile(`${base}/${file}`, 'utf8');
      } catch {
        continue;
      }
      const num = parseInt(raw.trim(), 10);
      if (!Number.isFinite(num)) continue;

      if (tempM) {
        const idx = tempM[1];
        let label = `temp${idx}`;
        try {
          label = (await readFile(`${base}/temp${idx}_label`, 'utf8')).trim() || label;
        } catch {}
        readings.push({
          chip,
          label,
          type: 'temp',
          value: Math.round((num / 1000) * 10) / 10,
          unit: '°C',
        });
      } else if (fanM) {
        const idx = fanM[1];
        let label = `fan${idx}`;
        try {
          label = (await readFile(`${base}/fan${idx}_label`, 'utf8')).trim() || label;
        } catch {}
        readings.push({ chip, label, type: 'fan', value: num, unit: 'RPM' });
      }
    }
  }

  return readings;
}

// Raspberry Pi throttle/voltage state via `vcgencmd get_throttled`.
async function getThrottle(): Promise<ThrottleStatus> {
  try {
    const { stdout } = await execAsync('vcgencmd get_throttled', { timeout: 4000 });
    const m = stdout.match(/throttled=(0x[0-9a-fA-F]+)/);
    if (!m) return { available: false };
    const bits = parseInt(m[1], 16);
    return {
      available: true,
      raw: m[1],
      underVoltageNow: (bits & 0x1) !== 0,
      freqCappedNow: (bits & 0x2) !== 0,
      throttledNow: (bits & 0x4) !== 0,
      softTempLimitNow: (bits & 0x8) !== 0,
      underVoltageOccurred: (bits & 0x10000) !== 0,
      freqCappedOccurred: (bits & 0x20000) !== 0,
      throttledOccurred: (bits & 0x40000) !== 0,
      softTempLimitOccurred: (bits & 0x80000) !== 0,
    };
  } catch {
    return { available: false };
  }
}

export async function getSensorsStats(): Promise<SensorsStats> {
  const [cpuTemps, hwmon, throttle] = await Promise.all([
    getCpuTemps(),
    getHwmon(),
    getThrottle(),
  ]);
  return { cpuTemps, hwmon, throttle };
}
