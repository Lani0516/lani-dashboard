import { useState } from 'react';
import {
  FaHeartPulse,
  FaArrowsRotate,
  FaPlus,
  FaTrash,
  FaCircleCheck,
  FaCircleXmark,
  FaGaugeHigh,
  FaServer,
} from 'react-icons/fa6';
import { useApi } from '../../hooks/useApi';
import { getToken } from '../../services/api';
import type { UptimeStatus, UptimeProbeResult } from '@shared/types/index.js';

type MonitorType = 'http' | 'tcp' | 'ping';

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function typeBadgeClass(type: MonitorType): string {
  switch (type) {
    case 'http':
      return 'bg-primary/15 text-primary';
    case 'tcp':
      return 'bg-warning/15 text-warning';
    default:
      return 'bg-success/15 text-success';
  }
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function HistoryStrip({ history }: { history: UptimeProbeResult[] }) {
  const slice = history.slice(-40);
  if (slice.length === 0) {
    return <div className="text-text-muted text-[11px]">Awaiting first probe…</div>;
  }
  return (
    <div className="flex items-stretch gap-0.5 h-7">
      {slice.map((h, i) => (
        <div
          key={i}
          className={`flex-1 min-w-[3px] rounded-sm transition-colors ${
            h.up ? 'bg-success/70 hover:bg-success' : 'bg-error/70 hover:bg-error'
          }`}
          title={`${fmtTime(h.timestamp)} · ${h.up ? `${h.latencyMs}ms` : h.error || 'down'}`}
        />
      ))}
    </div>
  );
}

function Sparkline({ history }: { history: UptimeProbeResult[] }) {
  const pts = history.slice(-40).filter((h) => h.up && Number.isFinite(h.latencyMs));
  if (pts.length < 2) return null;
  const lat = pts.map((p) => p.latencyMs);
  const max = Math.max(...lat);
  const min = Math.min(...lat);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const coords = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p.latencyMs - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-7">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
    </svg>
  );
}

export function UptimeTool() {
  const { data, loading, error, refetch } = useApi<UptimeStatus[]>('/uptime/status', 15000);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<MonitorType>('http');
  const [target, setTarget] = useState('');
  const [expectedStatus, setExpectedStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const monitors = data ?? [];
  const total = monitors.length;
  const upCount = monitors.filter((m) => m.up).length;
  const downCount = total - upCount;
  const latencies = monitors.filter((m) => m.latencyMs != null).map((m) => m.latencyMs as number);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  async function addMonitor() {
    if (!label.trim() || !target.trim()) {
      setFormError('Label and target are required');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        label: label.trim(),
        type,
        target: target.trim(),
      };
      if (type === 'http' && expectedStatus.trim()) {
        const n = Number(expectedStatus.trim());
        if (Number.isFinite(n)) body.expectedStatus = n;
      }
      const res = await fetch('/api/uptime', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to add monitor');
      setLabel('');
      setTarget('');
      setExpectedStatus('');
      refetch();
    } catch (e) {
      setFormError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function removeMonitor(id: string, name: string) {
    if (!window.confirm(`Delete monitor "${name}"?`)) return;
    try {
      await fetch(`/api/uptime/${id}`, { method: 'DELETE', headers: authHeaders() });
      refetch();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FaHeartPulse size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-text">Uptime Monitor</h1>
            <p className="text-xs text-text-muted">Live health checks for your services</p>
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

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <FaServer size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Monitors</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-text">{total}</div>
        </div>
        <div className="rounded-xl border border-success/40 bg-success/10 p-4">
          <div className="flex items-center gap-2 text-success">
            <FaCircleCheck size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Up</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-success">{upCount}</div>
        </div>
        <div className="rounded-xl border border-error/40 bg-error/10 p-4">
          <div className="flex items-center gap-2 text-error">
            <FaCircleXmark size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Down</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-error">{downCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-text-muted">
            <FaGaugeHigh size={13} />
            <span className="text-[11px] font-semibold uppercase tracking-wide">Avg latency</span>
          </div>
          <div className="mt-2 text-3xl font-bold text-text">
            {avgLatency != null ? `${avgLatency}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Add monitor form */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
          <FaPlus size={12} className="text-primary" /> Add monitor
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto_2fr_auto_auto] xl:items-end">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase text-text-muted">Label</span>
            <input
              className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 text-sm text-text"
              placeholder="My API"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase text-text-muted">Type</span>
            <select
              className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 text-sm text-text"
              value={type}
              onChange={(e) => setType(e.target.value as MonitorType)}
            >
              <option value="http">HTTP</option>
              <option value="tcp">TCP</option>
              <option value="ping">Ping</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase text-text-muted">Target</span>
            <input
              className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 font-mono text-sm text-text"
              placeholder={type === 'http' ? 'https://example.com' : type === 'tcp' ? 'host:port' : 'host'}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold uppercase text-text-muted">
              Expected{type !== 'http' ? ' (http)' : ''}
            </span>
            <input
              className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 font-mono text-sm text-text disabled:opacity-40"
              placeholder="200"
              inputMode="numeric"
              disabled={type !== 'http'}
              value={expectedStatus}
              onChange={(e) => setExpectedStatus(e.target.value)}
            />
          </label>
          <button
            onClick={addMonitor}
            disabled={busy}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <FaPlus size={12} />
            {busy ? 'Adding' : 'Add'}
          </button>
        </div>
        {formError && <div className="mt-2 text-xs text-error">{formError}</div>}
      </div>

      {error && (
        <div className="rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && total === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-card px-6 py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
            <FaHeartPulse size={24} />
          </div>
          <h3 className="text-base font-bold text-text">No monitors yet</h3>
          <p className="mt-1 max-w-sm text-sm text-text-muted">
            Add your first monitor above to start tracking the uptime and latency of your services.
          </p>
        </div>
      )}

      {/* Monitor cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {monitors.map((m) => (
          <div
            key={m.id}
            className={`group flex flex-col rounded-xl border bg-bg-card p-4 ${
              m.up ? 'border-border' : 'border-error/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${typeBadgeClass(m.type)}`}>
                    {m.type}
                  </span>
                  <h3 className="truncate text-sm font-bold text-text">{m.label}</h3>
                </div>
                <div className="mt-1 truncate font-mono text-[11px] text-text-muted">{m.target}</div>
              </div>
              <button
                onClick={() => removeMonitor(m.id, m.label)}
                className="shrink-0 text-text-muted opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                title="Delete monitor"
              >
                <FaTrash size={13} />
              </button>
            </div>

            <div className="mt-3 flex items-end justify-between">
              <div
                className={`flex items-center gap-2 text-xl font-bold ${m.up ? 'text-success' : 'text-error'}`}
              >
                {m.up ? <FaCircleCheck size={18} /> : <FaCircleXmark size={18} />}
                {m.up ? 'UP' : 'DOWN'}
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-text">
                  {m.latencyMs != null ? `${m.latencyMs}ms` : '—'}
                </div>
                <div className="text-[10px] uppercase text-text-muted">latency</div>
              </div>
            </div>

            {!m.up && m.lastError && (
              <div className="mt-2 truncate rounded bg-error/10 px-2 py-1 text-[11px] text-error" title={m.lastError}>
                {m.lastError}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
              <span>Uptime</span>
              <span className={`font-mono font-semibold ${m.uptimePercent >= 99 ? 'text-success' : m.uptimePercent >= 90 ? 'text-warning' : 'text-error'}`}>
                {m.uptimePercent.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2">
              <HistoryStrip history={m.history} />
            </div>
            <div className="mt-2">
              <Sparkline history={m.history} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
