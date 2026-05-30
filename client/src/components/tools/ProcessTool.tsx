import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaMicrochip,
  FaMemory,
  FaXmark,
  FaMagnifyingGlass,
  FaArrowsRotate,
  FaHashtag,
  FaListUl,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import { getToken } from '../../services/api';
import type {
  ProcessList,
  ProcessInfo,
  ApiResponse,
  KillResult,
} from '@shared/types/index.js';

type Sort = 'cpu' | 'mem';
type Signal = 'SIGTERM' | 'SIGKILL';

function fmtBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function Bar({ pct, tone }: { pct: number; tone: 'cpu' | 'mem' }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
      <div
        className={`h-full rounded-full ${tone === 'cpu' ? 'bg-primary' : 'bg-success'}`}
        style={{ width: `${clamped}%` }}
      />
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
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-card px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase text-text-muted">{label}</div>
        <div className="truncate text-sm font-bold text-text" title={value}>
          {value}
        </div>
        {sub && <div className="truncate text-[11px] text-text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function ProcessTool() {
  const [sort, setSort] = useState<Sort>('cpu');
  const [limit, setLimit] = useState(50);
  const [rawQ, setRawQ] = useState('');
  const [q, setQ] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [data, setData] = useState<ProcessList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [killMenu, setKillMenu] = useState<number | null>(null);
  const [killError, setKillError] = useState<{ pid: number; msg: string } | null>(null);
  const [killing, setKilling] = useState<number | null>(null);

  // Debounce the search input into `q`.
  useEffect(() => {
    const t = setTimeout(() => setQ(rawQ), 300);
    return () => clearTimeout(t);
  }, [rawQ]);

  const query = useMemo(
    () => `/api/process/list?sort=${sort}&q=${encodeURIComponent(q)}&limit=${limit}`,
    [sort, q, limit]
  );

  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchData = useMemo(
    () => async () => {
      try {
        const res = await fetch(queryRef.current);
        const json: ApiResponse<ProcessList> = await res.json();
        if (json.ok && json.data) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || 'Unknown error');
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Refetch whenever query changes, and poll when auto-refresh is on.
  useEffect(() => {
    setLoading(true);
    fetchData();
    if (!autoRefresh) return;
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [query, autoRefresh, fetchData]);

  const topCpu = useMemo<ProcessInfo | null>(() => {
    if (!data) return null;
    return data.processes.reduce<ProcessInfo | null>(
      (best, p) => (!best || p.cpu > best.cpu ? p : best),
      null
    );
  }, [data]);

  const topMem = useMemo<ProcessInfo | null>(() => {
    if (!data) return null;
    return data.processes.reduce<ProcessInfo | null>(
      (best, p) => (!best || p.memPercent > best.memPercent ? p : best),
      null
    );
  }, [data]);

  async function doKill(pid: number, signal: Signal) {
    setKilling(pid);
    setKillError(null);
    setKillMenu(null);
    try {
      const token = getToken();
      const res = await fetch('/api/process/kill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pid, signal }),
      });
      const json: ApiResponse<KillResult> = await res.json();
      if (!json.ok || (json.data && !json.data.ok)) {
        setKillError({ pid, msg: json.error || json.data?.error || 'Kill failed' });
      } else {
        fetchData();
      }
    } catch (e) {
      setKillError({ pid, msg: String(e) });
    } finally {
      setKilling(null);
    }
  }

  const online = !!data && !error;

  return (
    <div className="p-6 space-y-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <FaMicrochip size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-text">Process Manager</h1>
          <p className="text-xs text-text-muted">
            Live system processes
            {online && ` · updated ${new Date(data!.timestamp).toLocaleTimeString()}`}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<FaListUl size={15} />}
          label="Total processes"
          value={data ? String(data.total) : '—'}
          sub={data ? `showing ${data.processes.length}` : undefined}
        />
        <SummaryCard
          icon={<FaMicrochip size={15} />}
          label="Top CPU"
          value={topCpu ? topCpu.name : '—'}
          sub={topCpu ? `${topCpu.cpu.toFixed(1)}% · pid ${topCpu.pid}` : undefined}
        />
        <SummaryCard
          icon={<FaMemory size={15} />}
          label="Top memory"
          value={topMem ? topMem.name : '—'}
          sub={topMem ? `${topMem.memPercent.toFixed(1)}% · ${fmtBytes(topMem.rssBytes)}` : undefined}
        />
        <SummaryCard
          icon={<FaHashtag size={15} />}
          label="Sorted by"
          value={(data?.sort ?? sort).toUpperCase()}
          sub={autoRefresh ? 'auto-refresh on' : 'auto-refresh off'}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-card p-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-md border border-border bg-bg-hover px-3">
          <FaMagnifyingGlass size={12} className="text-text-muted" />
          <input
            className="w-full bg-transparent py-2 text-sm text-text outline-none"
            placeholder="Filter by name or user"
            value={rawQ}
            onChange={(e) => setRawQ(e.target.value)}
          />
          {rawQ && (
            <button
              onClick={() => setRawQ('')}
              className="text-text-muted hover:text-text"
              title="Clear"
            >
              <FaXmark size={12} />
            </button>
          )}
        </div>

        <div className="flex rounded-md border border-border bg-bg-hover p-0.5">
          {(['cpu', 'mem'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                sort === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
              }`}
            >
              {s === 'cpu' ? <FaMicrochip size={11} /> : <FaMemory size={11} />}
              {s === 'cpu' ? 'CPU' : 'MEM'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase text-text-muted">Limit</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-md border border-border bg-bg-hover px-2 py-1.5 text-sm text-text outline-none"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setAutoRefresh((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            autoRefresh
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border bg-bg-hover text-text-muted hover:text-text'
          }`}
          title="Toggle auto-refresh (5s)"
        >
          <FaArrowsRotate size={12} className={autoRefresh ? 'animate-spin' : ''} />
          Auto 5s
        </button>

        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-hover px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-primary hover:text-text"
          title="Refresh now"
        >
          <FaArrowsRotate size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
          <FaTriangleExclamation size={12} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-bg-card">
              <tr className="border-b border-border text-left text-text-muted">
                <th className="px-3 py-2 text-[11px] font-semibold uppercase">Name</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase">PID</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase">PPID</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase">User</th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase">
                  <button
                    onClick={() => setSort('cpu')}
                    className={`flex items-center gap-1 transition-colors hover:text-text ${
                      sort === 'cpu' ? 'text-primary' : ''
                    }`}
                  >
                    <FaMicrochip size={10} /> CPU%
                  </button>
                </th>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase">
                  <button
                    onClick={() => setSort('mem')}
                    className={`flex items-center gap-1 transition-colors hover:text-text ${
                      sort === 'mem' ? 'text-primary' : ''
                    }`}
                  >
                    <FaMemory size={10} /> MEM%
                  </button>
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase">RSS</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase">Kill</th>
              </tr>
            </thead>
            <tbody>
              {data?.processes.map((p, i) => (
                <tr
                  key={p.pid}
                  className={`border-t border-border transition-colors hover:bg-bg-hover ${
                    i % 2 === 1 ? 'bg-bg/40' : ''
                  }`}
                >
                  <td className="max-w-[260px] px-3 py-2">
                    <div className="truncate text-text" title={p.name}>
                      {p.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-secondary">{p.pid}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-muted">{p.ppid}</td>
                  <td className="max-w-[120px] truncate px-3 py-2 text-text-muted" title={p.user}>
                    {p.user}
                  </td>
                  <td className="w-[140px] px-3 py-2">
                    <div className="font-mono text-text-secondary">{p.cpu.toFixed(1)}%</div>
                    <Bar pct={p.cpu} tone="cpu" />
                  </td>
                  <td className="w-[140px] px-3 py-2">
                    <div className="font-mono text-text-secondary">{p.memPercent.toFixed(1)}%</div>
                    <Bar pct={p.memPercent} tone="mem" />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-muted">
                    {fmtBytes(p.rssBytes)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="relative inline-block">
                      {killError?.pid === p.pid ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] text-error"
                          title={killError.msg}
                        >
                          <FaTriangleExclamation size={10} />
                          <span className="max-w-[120px] truncate">{killError.msg}</span>
                          <button
                            onClick={() => setKillError(null)}
                            className="ml-1 text-text-muted hover:text-text"
                          >
                            <FaXmark size={10} />
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setKillMenu(killMenu === p.pid ? null : p.pid)}
                          disabled={killing === p.pid}
                          className="rounded p-1 text-text-muted transition-colors hover:bg-bg hover:text-error disabled:opacity-50"
                          title="Kill process"
                        >
                          <FaXmark size={14} className={killing === p.pid ? 'animate-spin' : ''} />
                        </button>
                      )}

                      {killMenu === p.pid && (
                        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-bg-card text-left shadow-lg">
                          <div className="border-b border-border px-3 py-2 text-[11px] text-text-muted">
                            Kill <span className="font-mono text-text">{p.pid}</span>?
                          </div>
                          <button
                            onClick={() => doKill(p.pid, 'SIGTERM')}
                            className="block w-full px-3 py-2 text-left text-xs text-text transition-colors hover:bg-bg-hover"
                          >
                            SIGTERM <span className="text-text-muted">(graceful)</span>
                          </button>
                          <button
                            onClick={() => doKill(p.pid, 'SIGKILL')}
                            className="block w-full px-3 py-2 text-left text-xs text-error transition-colors hover:bg-bg-hover"
                          >
                            SIGKILL <span className="text-text-muted">(force)</span>
                          </button>
                          <button
                            onClick={() => setKillMenu(null)}
                            className="block w-full border-t border-border px-3 py-1.5 text-left text-[11px] text-text-muted transition-colors hover:bg-bg-hover"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.processes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-text-muted">
                    No processes match the current filter.
                  </td>
                </tr>
              )}
              {!data && loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-text-muted">
                    Loading processes…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {data && (
        <div className="text-[11px] text-text-muted">
          Showing {data.processes.length} of {data.total} processes · sorted by{' '}
          {data.sort.toUpperCase()}
        </div>
      )}
    </div>
  );
}
