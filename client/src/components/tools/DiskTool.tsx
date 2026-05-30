import { useEffect, useRef, useState } from 'react';
import {
  FaHardDrive,
  FaArrowsRotate,
  FaArrowDown,
  FaArrowUp,
  FaHeartPulse,
  FaDatabase,
  FaGaugeHigh,
  FaCircleCheck,
  FaCircleXmark,
  FaTemperatureHalf,
  FaClock,
} from 'react-icons/fa6';
import { useApi } from '../../hooks/useApi';
import type { DiskStats } from '@shared/types/index.js';

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtRate(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return '0 KB/s';
  return `${fmtBytes(bps)}/s`;
}

function fmtPowerOn(hours?: number): string {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0) return '—';
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  if (days <= 0) return `${Math.round(hours)}h`;
  return `${days}d ${rem}h`;
}

type Severity = 'ok' | 'warn' | 'crit';

function severity(pct: number): Severity {
  if (pct >= 90) return 'crit';
  if (pct >= 70) return 'warn';
  return 'ok';
}

// Tailwind theme classes keyed by severity.
const ringStroke: Record<Severity, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  crit: 'text-error',
};
const barFill: Record<Severity, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  crit: 'bg-error',
};

interface IoSample {
  read: number;
  write: number;
}

const MAX_HISTORY = 30;

// Inline radial usage ring.
function UsageRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;
  const sev = severity(clamped);
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          className="text-bg-hover"
          stroke="currentColor"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          className={`${ringStroke[sev]} transition-all duration-500`}
          stroke="currentColor"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-text">{Math.round(clamped)}%</span>
        <span className="text-[10px] uppercase tracking-wide text-text-muted">used</span>
      </div>
    </div>
  );
}

// Tiny sparkline of a numeric series, scaled to its own max.
function Sparkline({
  values,
  colorClass,
}: {
  values: number[];
  colorClass: string;
}) {
  const w = 120;
  const h = 32;
  if (values.length < 2) {
    return <svg width={w} height={h} className="block" />;
  }
  const max = Math.max(...values, 1);
  const step = w / (MAX_HISTORY - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${((values.length - 1) * step).toFixed(1)},${h}`;
  return (
    <svg width={w} height={h} className="block" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} className={`${colorClass} opacity-10`} fill="currentColor" />
      <polyline
        points={line}
        fill="none"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={colorClass}
        stroke="currentColor"
      />
    </svg>
  );
}

export function DiskTool() {
  const { data, loading, error, refetch } = useApi<DiskStats>('/disk/stats', 4000);
  const [history, setHistory] = useState<IoSample[]>([]);
  const lastTs = useRef<number>(0);

  // Append a totals sample whenever a fresh payload arrives.
  useEffect(() => {
    if (!data || data.timestamp === lastTs.current) return;
    lastTs.current = data.timestamp;
    const read = data.io.reduce((acc, d) => acc + (d.readBps || 0), 0);
    const write = data.io.reduce((acc, d) => acc + (d.writeBps || 0), 0);
    setHistory((prev) => [...prev, { read, write }].slice(-MAX_HISTORY));
  }, [data]);

  const online = !!data && !error;

  // Only count "real" mounts (positive capacity) for the summary.
  const realMounts = (data?.mounts ?? []).filter((m) => m.totalBytes > 0);
  const totalCap = realMounts.reduce((a, m) => a + m.totalBytes, 0);
  const totalUsed = realMounts.reduce((a, m) => a + m.usedBytes, 0);
  const totalFree = realMounts.reduce((a, m) => a + m.availBytes, 0);

  const readHist = history.map((s) => s.read);
  const writeHist = history.map((s) => s.write);
  const curRead = history.length ? history[history.length - 1].read : 0;
  const curWrite = history.length ? history[history.length - 1].write : 0;
  const peakRead = readHist.length ? Math.max(...readHist) : 0;
  const peakWrite = writeHist.length ? Math.max(...writeHist) : 0;

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FaHardDrive size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-text">Disk &amp; Storage</h1>
            <p className="truncate text-xs text-text-muted">
              Capacity, SMART health and live I/O throughput
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary hover:text-text disabled:opacity-50"
        >
          <FaArrowsRotate size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {!data && loading && !error && (
        <div className="text-sm text-text-muted">Loading disk stats…</div>
      )}

      {data && online && (
        <>
          {/* Top summary */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              icon={<FaDatabase size={14} />}
              label="Total Capacity"
              value={fmtBytes(totalCap)}
            />
            <SummaryCard
              icon={<FaGaugeHigh size={14} />}
              label="Used"
              value={fmtBytes(totalUsed)}
              sub={totalCap > 0 ? `${Math.round((totalUsed / totalCap) * 100)}%` : undefined}
            />
            <SummaryCard
              icon={<FaHardDrive size={14} />}
              label="Free"
              value={fmtBytes(totalFree)}
            />
            <SummaryCard
              icon={<FaDatabase size={14} />}
              label="Mounts"
              value={String(realMounts.length)}
            />
          </div>

          {/* Mounts */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-text">Filesystems</h2>
            {realMounts.length === 0 && (
              <div className="text-sm text-text-muted">No filesystems found.</div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {realMounts.map((m) => {
                const hasInodes =
                  typeof m.inodesPercent === 'number' &&
                  typeof m.inodesUsed === 'number' &&
                  typeof m.inodesTotal === 'number';
                return (
                  <div
                    key={m.mount}
                    className="rounded-xl border border-border bg-bg-card p-4"
                  >
                    <div className="flex items-center gap-4">
                      <UsageRing pct={m.usePercent} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="truncate font-mono text-sm font-semibold text-text"
                            title={m.mount}
                          >
                            {m.mount}
                          </span>
                          {m.fsType && (
                            <span className="shrink-0 rounded bg-bg-hover px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                              {m.fsType}
                            </span>
                          )}
                        </div>
                        <dl className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <dt className="text-text-muted">Used</dt>
                            <dd className="font-mono text-text">{fmtBytes(m.usedBytes)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-text-muted">Total</dt>
                            <dd className="font-mono text-text">{fmtBytes(m.totalBytes)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-text-muted">Free</dt>
                            <dd className="font-mono text-text">{fmtBytes(m.availBytes)}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    {/* Inode usage mini-bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="text-text-muted">Inodes</span>
                        <span className="font-mono text-text-muted">
                          {hasInodes
                            ? `${m.inodesPercent}% · ${m.inodesUsed!.toLocaleString()} / ${m.inodesTotal!.toLocaleString()}`
                            : 'n/a'}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
                        {hasInodes && (
                          <div
                            className={`h-full rounded-full transition-all ${barFill[severity(m.inodesPercent!)]}`}
                            style={{ width: `${Math.min(100, m.inodesPercent!)}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SMART */}
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-text">
              <FaHeartPulse size={14} className="text-text-secondary" /> SMART Health
            </h2>
            {data.smart.available && data.smart.devices?.length ? (
              <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-muted">
                      <th className="px-4 py-2.5 font-semibold">Device</th>
                      <th className="px-4 py-2.5 font-semibold">Health</th>
                      <th className="px-4 py-2.5 font-semibold">Temp</th>
                      <th className="px-4 py-2.5 font-semibold">Power On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.smart.devices.map((d) => (
                      <tr key={d.device} className="border-b border-border last:border-0">
                        <td className="px-4 py-2.5 font-mono text-text">{d.device}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-bold ${
                              d.healthPassed
                                ? 'bg-success/20 text-success'
                                : 'bg-error/20 text-error'
                            }`}
                          >
                            {d.healthPassed ? (
                              <FaCircleCheck size={11} />
                            ) : (
                              <FaCircleXmark size={11} />
                            )}
                            {d.healthPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {typeof d.tempC === 'number' ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-text">
                              <FaTemperatureHalf
                                size={12}
                                className={
                                  d.tempC >= 60
                                    ? 'text-error'
                                    : d.tempC >= 45
                                      ? 'text-warning'
                                      : 'text-text-muted'
                                }
                              />
                              {d.tempC}°C
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 font-mono text-text-secondary">
                            <FaClock size={11} className="text-text-muted" />
                            {fmtPowerOn(d.powerOnHours)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-bg-card px-4 py-3 text-xs text-text-muted">
                SMART unavailable (smartctl missing or insufficient permissions).
              </div>
            )}
          </section>

          {/* I/O */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-text">I/O Activity</h2>

            {/* Throughput sparklines */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                    <FaArrowDown size={11} className="text-success" /> Total Read
                  </span>
                  <span className="font-mono text-sm text-text">{fmtRate(curRead)}</span>
                </div>
                <Sparkline values={readHist} colorClass="text-success" />
                <div className="mt-1 text-[10px] text-text-muted">peak {fmtRate(peakRead)}</div>
              </div>
              <div className="rounded-xl border border-border bg-bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                    <FaArrowUp size={11} className="text-primary" /> Total Write
                  </span>
                  <span className="font-mono text-sm text-text">{fmtRate(curWrite)}</span>
                </div>
                <Sparkline values={writeHist} colorClass="text-primary" />
                <div className="mt-1 text-[10px] text-text-muted">peak {fmtRate(peakWrite)}</div>
              </div>
            </div>

            {/* Per-device rates */}
            {data.io.length === 0 ? (
              <div className="text-sm text-text-muted">No active I/O devices.</div>
            ) : (
              <div className="space-y-2">
                {data.io.map((d) => {
                  const rPct = peakRead > 0 ? (d.readBps / peakRead) * 100 : 0;
                  const wPct = peakWrite > 0 ? (d.writeBps / peakWrite) * 100 : 0;
                  return (
                    <div
                      key={d.device}
                      className="rounded-xl border border-border bg-bg-card px-4 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-sm font-semibold text-text">
                          {d.device}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1 text-text-muted">
                              <FaArrowDown size={9} className="text-success" /> Read
                            </span>
                            <span className="font-mono text-text">{fmtRate(d.readBps)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
                            <div
                              className="h-full rounded-full bg-success transition-all"
                              style={{ width: `${Math.min(100, rPct)}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1 text-text-muted">
                              <FaArrowUp size={9} className="text-primary" /> Write
                            </span>
                            <span className="font-mono text-text">{fmtRate(d.writeBps)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, wPct)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
        <span className="text-text-secondary">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-bold text-text">{value}</span>
        {sub && <span className="text-xs text-text-muted">{sub}</span>}
      </div>
    </div>
  );
}
