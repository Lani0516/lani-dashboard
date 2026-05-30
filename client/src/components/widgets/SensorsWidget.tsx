import { FaTemperatureHalf, FaFan, FaArrowsRotate, FaMicrochip } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { SensorsStats } from '@shared/types/index.js';

function tempColor(c: number): string {
  if (c >= 80) return 'text-error';
  if (c >= 65) return 'text-warning';
  return 'text-primary';
}

export function SensorsWidget() {
  const { data, loading, error, refetch } = useApi<SensorsStats>('/sensors/stats', 10000);

  const hasData =
    !!data &&
    ((data.cpuTemps?.length ?? 0) > 0 ||
      (data.hwmon?.length ?? 0) > 0 ||
      !!data.throttle?.available);
  const online = hasData && !error;

  const throttle = data?.throttle;
  const anyNow =
    !!throttle?.underVoltageNow ||
    !!throttle?.freqCappedNow ||
    !!throttle?.throttledNow ||
    !!throttle?.softTempLimitNow;
  const anyOccurred =
    !!throttle?.underVoltageOccurred ||
    !!throttle?.freqCappedOccurred ||
    !!throttle?.throttledOccurred ||
    !!throttle?.softTempLimitOccurred;

  const throttleFlags: { label: string; now: boolean; occurred: boolean }[] = throttle?.available
    ? [
        { label: 'Under-voltage', now: !!throttle.underVoltageNow, occurred: !!throttle.underVoltageOccurred },
        { label: 'Freq capped', now: !!throttle.freqCappedNow, occurred: !!throttle.freqCappedOccurred },
        { label: 'Throttled', now: !!throttle.throttledNow, occurred: !!throttle.throttledOccurred },
        { label: 'Soft temp limit', now: !!throttle.softTempLimitNow, occurred: !!throttle.softTempLimitOccurred },
      ]
    : [];

  return (
    <WidgetCard
      title="Sensors"
      icon={<FaTemperatureHalf />}
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

        {data && !online && !error && (
          <div className="text-text-muted text-xs">No sensors available</div>
        )}

        {data && online && (
          <>
            {data.cpuTemps.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {data.cpuTemps.map((t) => (
                  <div
                    key={t.zone}
                    className="relative overflow-hidden rounded-xl p-3 border border-border bg-gradient-to-br from-primary/25 via-bg-hover to-bg-hover"
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl bg-primary/20" />
                    <div className="relative">
                      <div className="text-[11px] text-text-muted uppercase tracking-wider truncate">
                        {t.type}
                      </div>
                      <div className={`text-3xl font-bold font-mono leading-tight ${tempColor(t.value)}`}>
                        {t.value.toFixed(1)}°
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.hwmon.length > 0 && (
              <div className="space-y-1">
                {data.hwmon.map((s, i) => (
                  <div
                    key={`${s.chip}-${s.label}-${i}`}
                    className="flex items-center justify-between bg-bg-hover rounded-lg px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted min-w-0">
                      {s.type === 'fan' ? <FaFan size={10} /> : <FaMicrochip size={10} />}
                      <span className="truncate">
                        <span className="text-text-secondary">{s.chip}</span> · {s.label}
                      </span>
                    </div>
                    <div
                      className={`font-mono font-bold text-sm shrink-0 ${
                        s.type === 'temp' ? tempColor(s.value) : 'text-text'
                      }`}
                    >
                      {s.type === 'temp' ? s.value.toFixed(1) : s.value}
                      <span className="text-[10px] text-text-muted ml-0.5">{s.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {throttle?.available && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Pi throttle</span>
                  <span className="font-mono">{throttle.raw}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!anyNow && !anyOccurred && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-success/20 text-success">
                      All clear
                    </span>
                  )}
                  {throttleFlags
                    .filter((f) => f.now || f.occurred)
                    .map((f) => (
                      <span
                        key={f.label}
                        className={`text-[11px] px-1.5 py-0.5 rounded ${
                          f.now ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
                        }`}
                        title={f.now ? 'Active now' : 'Occurred since boot'}
                      >
                        {f.label}
                        {f.now ? '' : ' (past)'}
                      </span>
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
