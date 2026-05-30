import { useState } from 'react';
import { FaHeartPulse, FaArrowsRotate, FaPlus, FaTrash, FaXmark } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { UptimeStatus } from '@shared/types/index.js';

type MonitorType = 'http' | 'tcp' | 'ping';

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem('dashboard-token') || '';
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export function UptimeWidget() {
  const { data, loading, error, refetch } = useApi<UptimeStatus[]>('/uptime/status', 15000);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<MonitorType>('http');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const targets = data ?? [];
  const online = !error;

  async function addTarget() {
    if (!label.trim() || !target.trim()) {
      setFormError('Label and target required');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch('/api/uptime', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ label: label.trim(), type, target: target.trim() }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Failed to add');
      setLabel('');
      setTarget('');
      setShowAdd(false);
      refetch();
    } catch (e) {
      setFormError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  async function removeTarget(id: string) {
    try {
      await fetch(`/api/uptime/${id}`, { method: 'DELETE', headers: authHeaders() });
      refetch();
    } catch {
      /* ignore */
    }
  }

  return (
    <WidgetCard
      title="Uptime"
      icon={<FaHeartPulse />}
      status={loading ? 'loading' : online ? 'online' : 'offline'}
      actions={
        <>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className={`px-2 py-1 rounded bg-bg-hover flex items-center transition-colors ${
              showAdd ? 'text-primary' : 'text-text-muted hover:text-text'
            }`}
            title="Add monitor"
          >
            {showAdd ? <FaXmark size={12} /> : <FaPlus size={12} />}
          </button>
          <button
            onClick={refetch}
            className="text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover flex items-center transition-colors"
            title="Refresh"
          >
            <FaArrowsRotate size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {showAdd && (
          <div className="space-y-2 bg-bg-hover rounded-lg p-2.5">
            <input
              className="w-full bg-bg border border-border rounded px-2 py-1 text-xs text-text"
              placeholder="Label (e.g. My API)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                className="bg-bg border border-border rounded px-2 py-1 text-xs text-text"
                value={type}
                onChange={(e) => setType(e.target.value as MonitorType)}
              >
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
                <option value="ping">Ping</option>
              </select>
              <input
                className="flex-1 min-w-0 bg-bg border border-border rounded px-2 py-1 text-xs text-text"
                placeholder={
                  type === 'http' ? 'https://example.com' : type === 'tcp' ? 'host:port' : 'host'
                }
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            {formError && <div className="text-error text-[11px]">{formError}</div>}
            <button
              onClick={addTarget}
              disabled={busy}
              className="w-full bg-primary text-white rounded px-2 py-1 text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <FaPlus size={10} /> Add monitor
            </button>
          </div>
        )}

        {error && <div className="text-error text-xs">{error}</div>}

        {!error && targets.length === 0 && !showAdd && (
          <div className="text-text-muted text-xs">No monitors yet — add one with the + button.</div>
        )}

        {targets.map((t) => (
          <div key={t.id} className="bg-bg-hover rounded-lg p-2.5 group">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.up ? 'bg-success' : 'bg-error'}`}
                />
                <div className="min-w-0">
                  <div className="text-text text-xs font-medium truncate">{t.label}</div>
                  <div className="text-text-muted text-[10px] truncate font-mono">
                    {t.type.toUpperCase()} · {t.target}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-text text-xs font-mono">
                    {t.latencyMs != null ? `${t.latencyMs}ms` : '—'}
                  </div>
                  <div className="text-text-muted text-[10px] font-mono">
                    {t.uptimePercent.toFixed(0)}%
                  </div>
                </div>
                <button
                  onClick={() => removeTarget(t.id)}
                  className="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <FaTrash size={11} />
                </button>
              </div>
            </div>
            <div className="flex items-end gap-0.5 mt-2 h-5">
              {t.history.slice(-30).map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${h.up ? 'bg-success/70' : 'bg-error/70'}`}
                  style={{ height: `${Math.max(15, Math.min(100, h.up ? 40 + Math.min(60, h.latencyMs / 10) : 100))}%` }}
                  title={
                    h.up ? `${h.latencyMs}ms` : h.error || 'down'
                  }
                />
              ))}
              {t.history.length === 0 && (
                <div className="text-text-muted text-[10px]">awaiting first probe…</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}
