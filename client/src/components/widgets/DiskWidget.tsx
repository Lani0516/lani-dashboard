import { FaHardDrive, FaArrowsRotate, FaArrowDown, FaArrowUp, FaHeartPulse } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
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

// Pick a bar color based on fullness.
function usageColor(pct: number): string {
  if (pct >= 90) return 'bg-error';
  if (pct >= 75) return 'bg-warning';
  return 'bg-primary';
}

export function DiskWidget() {
  const { data, loading, error, refetch } = useApi<DiskStats>('/disk/stats', 15000);
  const online = !!data && !error;

  return (
    <WidgetCard
      title="Disk / Storage"
      icon={<FaHardDrive />}
      status={loading ? 'loading' : online ? 'online' : 'offline'}
      actions={
        <button
          onClick={refetch}
          className="text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover flex items-center transition-colors"
          title="Refresh"
        >
          <FaArrowsRotate size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      <div className="space-y-3">
        {error && <div className="text-error text-xs">{error}</div>}

        {data && online && (
          <>
            {/* Mount usage */}
            <div className="space-y-2.5">
              {data.mounts.length === 0 && (
                <div className="text-text-muted text-xs">No filesystems found.</div>
              )}
              {data.mounts.map((m) => (
                <div key={m.mount}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-text font-mono truncate mr-2" title={m.mount}>
                      {m.mount}
                      {m.fsType && <span className="text-text-muted ml-1">({m.fsType})</span>}
                    </span>
                    <span className="text-text-muted font-mono whitespace-nowrap">
                      {fmtBytes(m.usedBytes)} / {fmtBytes(m.totalBytes)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-hover overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${usageColor(m.usePercent)}`}
                      style={{ width: `${Math.min(100, m.usePercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-muted mt-0.5">
                    <span>{m.usePercent}% used</span>
                    <span>
                      {typeof m.inodesPercent === 'number'
                        ? `inodes ${m.inodesPercent}%`
                        : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* SMART health */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-1.5">
                <FaHeartPulse size={10} /> SMART Health
              </div>
              {data.smart.available && data.smart.devices?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {data.smart.devices.map((d) => (
                    <div
                      key={d.device}
                      className="flex items-center gap-1.5 bg-bg-hover rounded-lg px-2 py-1"
                    >
                      <span className="text-[11px] text-text font-mono">{d.device}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          d.healthPassed
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {d.healthPassed ? 'PASS' : 'FAIL'}
                      </span>
                      {typeof d.tempC === 'number' && (
                        <span className="text-[10px] text-text-muted font-mono">{d.tempC}°C</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-hover">
                  N/A
                </span>
              )}
            </div>

            {/* I/O rates */}
            {data.io.length > 0 && (
              <div>
                <div className="text-[11px] text-text-muted mb-1.5">I/O Activity</div>
                <div className="space-y-1">
                  {data.io.map((d) => (
                    <div
                      key={d.device}
                      className="flex items-center justify-between text-[11px] bg-bg-hover rounded-lg px-2 py-1"
                    >
                      <span className="text-text font-mono">{d.device}</span>
                      <div className="flex items-center gap-3 font-mono text-text-muted">
                        <span className="flex items-center gap-1">
                          <FaArrowDown size={9} className="text-success" /> {fmtRate(d.readBps)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaArrowUp size={9} className="text-primary" /> {fmtRate(d.writeBps)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  );
}
