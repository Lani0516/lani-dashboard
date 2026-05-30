import { useEffect, useRef, useState } from 'react';
import {
  FaArrowsRotate,
  FaCircleCheck,
  FaFan,
  FaMicrochip,
  FaTemperatureHalf,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import { useApi } from '../../hooks/useApi';
import type { CpuTemp, HwmonReading, SensorsStats } from '@shared/types/index.js';

const HISTORY_LEN = 60;

function tempTone(c: number): { text: string; stroke: string } {
  if (c > 80) return { text: 'text-error', stroke: 'var(--color-error)' };
  if (c >= 60) return { text: 'text-warning', stroke: 'var(--color-warning)' };
  return { text: 'text-success', stroke: 'var(--color-success)' };
}

function RadialGauge({ temp }: { temp: CpuTemp }) {
  const size = 132;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270° arc, starting bottom-left (135°) going clockwise to bottom-right (45°)
  const startAngle = 135;
  const sweep = 270;
  const maxTemp = 100;
  const pct = Math.max(0, Math.min(1, temp.value / maxTemp));

  const polar = (angleDeg: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const arcPath = (fromDeg: number, toDeg: number) => {
    const start = polar(fromDeg);
    const end = polar(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  };

  const tone = tempTone(temp.value);
  const trackPath = arcPath(startAngle, startAngle + sweep);
  const valuePath = arcPath(startAngle, startAngle + sweep * pct);

  return (
    <div className="relative flex flex-col items-center rounded-xl border border-border bg-bg-card p-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={trackPath}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`font-mono text-3xl font-bold leading-none ${tone.text}`}>
          {temp.value.toFixed(1)}
          <span className="text-lg">°C</span>
        </div>
      </div>
      <div className="mt-2 max-w-full truncate text-center text-xs font-semibold uppercase tracking-wider text-text-secondary">
        {temp.type}
      </div>
      <div className="max-w-full truncate text-center text-[11px] text-text-muted">{temp.zone}</div>
    </div>
  );
}

function HistoryChart({ history }: { history: number[] }) {
  const w = 600;
  const h = 140;
  const pad = 8;
  if (history.length < 2) {
    return (
      <div className="flex h-[140px] items-center justify-center text-xs text-text-muted">
        Collecting samples…
      </div>
    );
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const lo = Math.floor(min - 2);
  const hi = Math.ceil(max + 2);
  const span = hi - lo || 1;

  const stepX = (w - pad * 2) / (HISTORY_LEN - 1);
  const points = history.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - lo) / span) * (h - pad * 2);
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const area = `${line} L ${last.x.toFixed(1)} ${h - pad} L ${points[0].x.toFixed(1)} ${h - pad} Z`;
  const current = history[history.length - 1];
  const tone = tempTone(current);

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sensorsArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone.stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={tone.stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sensorsArea)" stroke="none" />
      <path d={line} fill="none" stroke={tone.stroke} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3.5} fill={tone.stroke} />
    </svg>
  );
}

function HwmonChip({ chip, readings }: { chip: string; readings: HwmonReading[] }) {
  const temps = readings.filter((r) => r.type === 'temp');
  const fans = readings.filter((r) => r.type === 'fan');

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
        <FaMicrochip className="text-text-muted" />
        <span className="truncate">{chip}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {temps.map((r, i) => {
          const tone = tempTone(r.value);
          const pct = Math.max(0, Math.min(1, r.value / 100));
          return (
            <div key={`t-${r.label}-${i}`} className="rounded-lg bg-bg-hover p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate text-xs text-text-secondary">
                  <FaTemperatureHalf size={11} className="text-text-muted" />
                  {r.label}
                </span>
                <span className={`font-mono text-sm font-bold ${tone.text}`}>
                  {r.value.toFixed(1)}
                  <span className="ml-0.5 text-[10px] text-text-muted">{r.unit}</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct * 100}%`, backgroundColor: tone.stroke }}
                />
              </div>
            </div>
          );
        })}
        {fans.map((r, i) => (
          <div
            key={`f-${r.label}-${i}`}
            className="flex items-center justify-between rounded-lg bg-bg-hover p-3"
          >
            <span className="flex items-center gap-1.5 truncate text-xs text-text-secondary">
              <FaFan size={11} className={r.value > 0 ? 'animate-spin text-primary' : 'text-text-muted'} />
              {r.label}
            </span>
            <span className="font-mono text-sm font-bold text-text">
              {Math.round(r.value)}
              <span className="ml-0.5 text-[10px] text-text-muted">{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SensorsTool() {
  const { data, loading, error, refetch } = useApi<SensorsStats>('/sensors/stats', 5000);
  const [history, setHistory] = useState<number[]>([]);
  const lastSampleRef = useRef<number | undefined>(undefined);

  const cpuTemps = data?.cpuTemps ?? [];
  const hwmon = data?.hwmon ?? [];
  const throttle = data?.throttle;

  const primary = cpuTemps[0]?.value;

  // Keep latest primary in a ref so the sampler always sees current value.
  lastSampleRef.current = primary;

  useEffect(() => {
    const sample = () => {
      const v = lastSampleRef.current;
      if (v === undefined) return;
      setHistory((prev) => {
        const next = [...prev, v];
        return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next;
      });
    };
    sample();
    const timer = setInterval(sample, 5000);
    return () => clearInterval(timer);
  }, []);

  const hasData =
    cpuTemps.length > 0 || hwmon.length > 0 || !!throttle?.available;

  // group hwmon by chip preserving order
  const chips: { chip: string; readings: HwmonReading[] }[] = [];
  for (const r of hwmon) {
    let group = chips.find((g) => g.chip === r.chip);
    if (!group) {
      group = { chip: r.chip, readings: [] };
      chips.push(group);
    }
    group.readings.push(r);
  }

  const throttleFlags = throttle?.available
    ? [
        { label: 'Under-voltage', now: !!throttle.underVoltageNow, occurred: !!throttle.underVoltageOccurred },
        { label: 'Frequency capped', now: !!throttle.freqCappedNow, occurred: !!throttle.freqCappedOccurred },
        { label: 'Throttled', now: !!throttle.throttledNow, occurred: !!throttle.throttledOccurred },
        { label: 'Soft temp limit', now: !!throttle.softTempLimitNow, occurred: !!throttle.softTempLimitOccurred },
      ]
    : [];
  const anyNow = throttleFlags.some((f) => f.now);
  const anyOccurred = throttleFlags.some((f) => f.occurred);

  const overallBadge = anyNow
    ? { cls: 'bg-error/15 text-error', icon: <FaTriangleExclamation />, label: 'Throttling now' }
    : anyOccurred
      ? { cls: 'bg-warning/15 text-warning', icon: <FaTriangleExclamation />, label: 'Past events' }
      : { cls: 'bg-success/15 text-success', icon: <FaCircleCheck />, label: 'All clear' };

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FaTemperatureHalf size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text">Sensors</h1>
            <p className="text-xs text-text-muted">Live temperatures, fans, and throttle status</p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary hover:text-text disabled:opacity-50"
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

      {!error && data && !hasData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg-card py-16 text-center">
          <FaTemperatureHalf size={32} className="mb-3 text-text-muted" />
          <div className="text-sm font-semibold text-text">No sensors available on this host</div>
          <div className="mt-1 text-xs text-text-muted">
            This machine does not expose readable temperature, fan, or throttle data.
          </div>
        </div>
      )}

      {hasData && (
        <>
          {cpuTemps.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-text">CPU Temperatures</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {cpuTemps.map((t) => (
                  <RadialGauge key={t.zone} temp={t} />
                ))}
              </div>
              <div className="rounded-xl border border-border bg-bg-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    {cpuTemps[0].type} over time
                  </span>
                  <span className="text-[11px] text-text-muted">
                    last {history.length} samples (~{Math.round((history.length * 5) / 60 * 10) / 10} min)
                  </span>
                </div>
                <HistoryChart history={history} />
              </div>
            </section>
          )}

          {chips.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-text">Hardware Monitors</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {chips.map((g) => (
                  <HwmonChip key={g.chip} chip={g.chip} readings={g.readings} />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-text">Raspberry Pi Throttle</h2>
            {throttle?.available ? (
              <div className="rounded-xl border border-border bg-bg-card p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${overallBadge.cls}`}
                  >
                    {overallBadge.icon}
                    {overallBadge.label}
                  </span>
                  {throttle.raw && (
                    <span className="font-mono text-xs text-text-muted">
                      raw: <span className="text-text-secondary">{throttle.raw}</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Now
                    </div>
                    <div className="space-y-1.5">
                      {throttleFlags.map((f) => (
                        <div
                          key={`now-${f.label}`}
                          className="flex items-center justify-between rounded-lg bg-bg-hover px-3 py-2 text-xs"
                        >
                          <span className="text-text-secondary">{f.label}</span>
                          <span
                            className={`rounded px-2 py-0.5 font-semibold ${
                              f.now ? 'bg-error/20 text-error' : 'bg-success/15 text-success'
                            }`}
                          >
                            {f.now ? 'Active' : 'OK'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Occurred (since boot)
                    </div>
                    <div className="space-y-1.5">
                      {throttleFlags.map((f) => (
                        <div
                          key={`occ-${f.label}`}
                          className="flex items-center justify-between rounded-lg bg-bg-hover px-3 py-2 text-xs"
                        >
                          <span className="text-text-secondary">{f.label}</span>
                          <span
                            className={`rounded px-2 py-0.5 font-semibold ${
                              f.occurred ? 'bg-warning/20 text-warning' : 'bg-success/15 text-success'
                            }`}
                          >
                            {f.occurred ? 'Seen' : 'OK'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-bg-card px-4 py-6 text-center text-xs text-text-muted">
                vcgencmd unavailable (not a Raspberry Pi)
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
