import { useState } from 'react';
import { FaMicrochip, FaMemory, FaArrowsRotate, FaXmark, FaMagnifyingGlass } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { ProcessList, ApiResponse, KillResult } from '@shared/types/index.js';

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)}G`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(0)}M`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)}K`;
  return `${n}`;
}

export function ProcessWidget() {
  const [sort, setSort] = useState<'cpu' | 'mem'>('cpu');
  const [q, setQ] = useState('');
  const [killError, setKillError] = useState<string | null>(null);

  const query = `/process/list?sort=${sort}&q=${encodeURIComponent(q)}&limit=30`;
  const { data, loading, error, refetch } = useApi<ProcessList>(query, 5000);

  const online = !!data && !error;

  async function handleKill(pid: number, name: string) {
    if (!confirm(`Kill process "${name}" (pid ${pid})?\nSends SIGTERM.`)) return;
    setKillError(null);
    try {
      const token = localStorage.getItem('dashboard-token') || '';
      const res = await fetch('/api/process/kill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pid, signal: 'SIGTERM' }),
      });
      const json: ApiResponse<KillResult> = await res.json();
      if (!json.ok) {
        setKillError(json.error || 'Kill failed');
      } else {
        refetch();
      }
    } catch (e) {
      setKillError(String(e));
    }
  }

  return (
    <WidgetCard
      title="Processes"
      icon={<FaMicrochip />}
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
      <div className="space-y-2 flex flex-col h-full">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-bg-hover border border-border rounded p-0.5">
            {(['cpu', 'mem'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  sort === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {s === 'cpu' ? <FaMicrochip size={10} /> : <FaMemory size={10} />}
                {s === 'cpu' ? 'CPU' : 'MEM'}
              </button>
            ))}
          </div>
          <div className="flex-1 flex items-center gap-1 bg-bg-hover border border-border rounded px-2">
            <FaMagnifyingGlass size={10} className="text-text-muted" />
            <input
              className="w-full bg-transparent py-1 text-xs text-text outline-none"
              placeholder="Filter by name / user"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="text-error text-xs">{error}</div>}
        {killError && <div className="text-error text-xs">{killError}</div>}

        {data && (
          <div className="flex-1 overflow-auto -mx-1">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg-card">
                <tr className="text-text-muted text-left">
                  <th className="font-medium px-1 py-1">Name</th>
                  <th className="font-medium px-1 py-1 text-right">PID</th>
                  <th className="font-medium px-1 py-1 text-right">CPU</th>
                  <th className="font-medium px-1 py-1 text-right">MEM</th>
                  <th className="font-medium px-1 py-1">User</th>
                  <th className="font-medium px-1 py-1" />
                </tr>
              </thead>
              <tbody>
                {data.processes.map((p) => (
                  <tr key={p.pid} className="border-t border-border hover:bg-bg-hover">
                    <td className="px-1 py-1 text-text truncate max-w-[120px]" title={p.name}>
                      {p.name}
                    </td>
                    <td className="px-1 py-1 text-text-secondary font-mono text-right">{p.pid}</td>
                    <td className="px-1 py-1 text-text-secondary font-mono text-right">
                      {p.cpu.toFixed(1)}%
                    </td>
                    <td className="px-1 py-1 text-text-secondary font-mono text-right" title={`${fmtBytes(p.rssBytes)} RSS`}>
                      {p.memPercent.toFixed(1)}%
                    </td>
                    <td className="px-1 py-1 text-text-muted truncate max-w-[70px]" title={p.user}>
                      {p.user}
                    </td>
                    <td className="px-1 py-1 text-right">
                      <button
                        onClick={() => handleKill(p.pid, p.name)}
                        className="text-text-muted hover:text-error p-1 rounded hover:bg-bg transition-colors"
                        title="Kill (SIGTERM)"
                      >
                        <FaXmark size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {data.processes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-1 py-3 text-center text-text-muted">
                      No processes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <div className="text-[11px] text-text-muted">
            Showing {data.processes.length} of {data.total} · sorted by {data.sort.toUpperCase()}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
