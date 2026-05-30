import { useCallback, useEffect, useState } from 'react';
import {
  FaDocker,
  FaArrowsRotate,
  FaPlay,
  FaStop,
  FaRotateRight,
  FaFileLines,
  FaLayerGroup,
  FaHardDrive,
  FaBoxesStacked,
  FaTrash,
  FaXmark,
  FaMemory,
  FaCircleCheck,
  FaTriangleExclamation,
} from 'react-icons/fa6';
import { getToken } from '../../services/api';
import type {
  DockerStatus,
  DockerContainer,
  DockerImage,
  DockerVolume,
} from '@shared/types/index.js';

type Tab = 'containers' | 'images' | 'volumes';

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: authHeaders() });
  const json = await res.json().catch(() => ({ ok: false, error: 'Bad response' }));
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

async function mutate<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Bad response' }));
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data as T;
}

async function fetchLogs(id: string, tail: number): Promise<string> {
  const data = await getJson<{ logs: string }>(`/docker/containers/${id}/logs?tail=${tail}`);
  return data?.logs || '';
}

function fmtBytes(n: number): string {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</div>
        <div className="truncate text-xl font-bold text-text">{value}</div>
        {sub && <div className="truncate text-[11px] text-text-muted">{sub}</div>}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const running = state === 'running';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        running
          ? 'bg-success/15 text-success'
          : 'bg-bg-hover text-text-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-success' : 'bg-text-muted'}`} />
      {state || 'unknown'}
    </span>
  );
}

function Bar({ pct, tone }: { pct: number; tone: 'primary' | 'warning' | 'error' }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = tone === 'error' ? 'bg-error' : tone === 'warning' ? 'bg-warning' : 'bg-primary';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

function LogPanel({
  container,
  onClose,
}: {
  container: DockerContainer;
  onClose: () => void;
}) {
  const [tail, setTail] = useState(200);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setText(await fetchLogs(container.id, tail));
    } catch (e) {
      setText(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [container.id, tail]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FaFileLines className="shrink-0 text-text-muted" />
            <span className="truncate text-sm font-bold text-text">Logs: {container.name}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="rounded-md border border-border bg-bg-hover px-2 py-1 text-xs text-text"
            >
              {[100, 200, 500, 1000].map((t) => (
                <option key={t} value={t}>
                  {t} lines
                </option>
              ))}
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-text-secondary transition-colors hover:border-primary hover:text-text disabled:opacity-50"
              title="Refresh logs"
            >
              <FaArrowsRotate size={12} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-error hover:text-error"
              title="Close"
            >
              <FaXmark size={13} />
            </button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap bg-bg p-4 font-mono text-[11px] leading-relaxed text-text-secondary">
          {loading ? 'Loading…' : text || '(no output)'}
        </pre>
      </div>
    </div>
  );
}

export function DockerTool() {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>('containers');
  const [images, setImages] = useState<DockerImage[] | null>(null);
  const [volumes, setVolumes] = useState<DockerVolume[] | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pruning, setPruning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [logTarget, setLogTarget] = useState<DockerContainer | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getJson<DockerStatus>('/docker/status');
      setStatus(data);
      setStatusError(null);
    } catch (e) {
      setStatusError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const data = await getJson<{ images: DockerImage[] }>('/docker/images');
      setImages(data?.images || []);
    } catch {
      setImages([]);
    }
  }, []);

  const loadVolumes = useCallback(async () => {
    try {
      const data = await getJson<{ volumes: DockerVolume[] }>('/docker/volumes');
      setVolumes(data?.volumes || []);
    } catch {
      setVolumes([]);
    }
  }, []);

  // Auto-refresh container stats every 5s.
  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 5000);
    return () => clearInterval(timer);
  }, [loadStatus]);

  useEffect(() => {
    if (tab === 'images' && images === null) loadImages();
    if (tab === 'volumes' && volumes === null) loadVolumes();
  }, [tab, images, volumes, loadImages, loadVolumes]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const available = !!status?.available;
  const containers = status?.containers || [];
  const running = containers.filter((c) => c.state === 'running');
  const totalMem = running.reduce((sum, c) => sum + (c.memUsage || 0), 0);

  async function doAction(id: string, action: 'start' | 'stop' | 'restart') {
    setBusyId(id);
    setActionError(null);
    try {
      await mutate(`/docker/containers/${id}/${action}`);
      await loadStatus();
    } catch (e) {
      setActionError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusyId(null);
    }
  }

  async function doPrune() {
    if (!window.confirm('Prune all dangling images? This cannot be undone.')) return;
    setPruning(true);
    setActionError(null);
    try {
      const data = await mutate<{ reclaimed?: number } | number>('/docker/images/prune');
      const reclaimed =
        typeof data === 'number' ? data : data?.reclaimed ?? 0;
      setNotice(`Pruned dangling images — reclaimed ${fmtBytes(reclaimed)}.`);
      await loadImages();
    } catch (e) {
      setActionError(String(e instanceof Error ? e.message : e));
    } finally {
      setPruning(false);
    }
  }

  const tabBtn = (t: Tab, label: string, icon: React.ReactNode, count?: number) => (
    <button
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            tab === t ? 'bg-white/20' : 'bg-bg-hover text-text-muted'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FaDocker size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-text">Docker</h1>
              <p className="truncate text-xs text-text-muted">
                Manage containers, images, and volumes
              </p>
            </div>
          </div>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary hover:text-text disabled:opacity-50"
          >
            <FaArrowsRotate size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Notices */}
        {notice && (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            <FaCircleCheck size={14} className="shrink-0" />
            {notice}
          </div>
        )}
        {actionError && (
          <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error">
            <FaTriangleExclamation size={14} className="shrink-0" />
            {actionError}
          </div>
        )}

        {/* Unavailable empty state */}
        {!available && !loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bg-card py-16 text-center">
            <FaDocker size={40} className="text-text-muted/50" />
            <div className="text-sm font-semibold text-text">Docker unavailable</div>
            <div className="max-w-md text-xs text-text-muted">
              {status?.error || statusError || 'Could not reach the Docker daemon. Is /var/run/docker.sock available?'}
            </div>
          </div>
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<FaBoxesStacked size={18} />}
                label="Containers"
                value={`${running.length} / ${containers.length}`}
                sub="running / total"
              />
              <StatCard
                icon={<FaMemory size={18} />}
                label="Memory in use"
                value={fmtBytes(totalMem)}
                sub={`${running.length} running`}
              />
              <StatCard
                icon={<FaLayerGroup size={18} />}
                label="Images"
                value={images === null ? '—' : String(images.length)}
                sub="local images"
              />
              <StatCard
                icon={<FaHardDrive size={18} />}
                label="Volumes"
                value={volumes === null ? '—' : String(volumes.length)}
                sub="named volumes"
              />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-bg-card p-1">
              {tabBtn('containers', 'Containers', <FaBoxesStacked size={14} />, containers.length)}
              {tabBtn('images', 'Images', <FaLayerGroup size={14} />, images?.length)}
              {tabBtn('volumes', 'Volumes', <FaHardDrive size={14} />, volumes?.length)}
            </div>

            {/* Containers tab */}
            {tab === 'containers' && (
              <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
                {containers.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-text-muted">No containers.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Image</th>
                        <th className="px-4 py-2.5">State</th>
                        <th className="px-4 py-2.5 w-40">CPU</th>
                        <th className="px-4 py-2.5 w-48">Memory</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {containers.map((c) => {
                        const isRunning = c.state === 'running';
                        const busy = busyId === c.id;
                        const memPct = c.memLimit > 0 ? (c.memUsage / c.memLimit) * 100 : 0;
                        const cpuTone =
                          c.cpuPercent > 80 ? 'error' : c.cpuPercent > 50 ? 'warning' : 'primary';
                        const memTone = memPct > 90 ? 'error' : memPct > 70 ? 'warning' : 'primary';
                        return (
                          <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                            <td className="px-4 py-3">
                              <div className="font-medium text-text">{c.name}</div>
                              {!isRunning && (
                                <div className="truncate text-[11px] text-text-muted">{c.status}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-text-secondary">{c.image}</span>
                            </td>
                            <td className="px-4 py-3">
                              <StateBadge state={c.state} />
                            </td>
                            <td className="px-4 py-3">
                              {isRunning ? (
                                <div className="space-y-1">
                                  <div className="font-mono text-[11px] text-text-secondary">
                                    {c.cpuPercent.toFixed(1)}%
                                  </div>
                                  <Bar pct={c.cpuPercent} tone={cpuTone} />
                                </div>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isRunning ? (
                                <div className="space-y-1">
                                  <div className="font-mono text-[11px] text-text-secondary">
                                    {fmtBytes(c.memUsage)}
                                    {c.memLimit > 0 && ` / ${fmtBytes(c.memLimit)}`}
                                  </div>
                                  {c.memLimit > 0 && <Bar pct={memPct} tone={memTone} />}
                                </div>
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={busy || isRunning}
                                  onClick={() => doAction(c.id, 'start')}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-success hover:text-success disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-secondary"
                                  title="Start"
                                >
                                  <FaPlay size={11} />
                                </button>
                                <button
                                  disabled={busy || !isRunning}
                                  onClick={() => doAction(c.id, 'stop')}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-error hover:text-error disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-secondary"
                                  title="Stop"
                                >
                                  <FaStop size={11} />
                                </button>
                                <button
                                  disabled={busy || !isRunning}
                                  onClick={() => doAction(c.id, 'restart')}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-text-secondary"
                                  title="Restart"
                                >
                                  <FaRotateRight size={11} className={busy ? 'animate-spin' : ''} />
                                </button>
                                <button
                                  onClick={() => setLogTarget(c)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary transition-colors hover:border-primary hover:text-text"
                                  title="Logs"
                                >
                                  <FaFileLines size={11} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Images tab */}
            {tab === 'images' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={doPrune}
                    disabled={pruning}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-error hover:text-error disabled:opacity-50"
                  >
                    <FaTrash size={12} />
                    {pruning ? 'Pruning…' : 'Prune dangling'}
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
                  {images === null ? (
                    <div className="px-4 py-10 text-center text-sm text-text-muted">Loading…</div>
                  ) : images.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-text-muted">No images.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                          <th className="px-4 py-2.5">Tag</th>
                          <th className="px-4 py-2.5 text-right">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {images.map((img) => (
                          <tr key={img.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-text">{img.tag}</span>
                              {img.tags && img.tags.length > 1 && (
                                <div className="truncate text-[11px] text-text-muted">
                                  {img.tags.slice(1).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary">
                              {fmtBytes(img.size)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Volumes tab */}
            {tab === 'volumes' && (
              <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
                {volumes === null ? (
                  <div className="px-4 py-10 text-center text-sm text-text-muted">Loading…</div>
                ) : volumes.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-text-muted">No volumes.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-4 py-2.5">Driver</th>
                        <th className="px-4 py-2.5">Mountpoint</th>
                      </tr>
                    </thead>
                    <tbody>
                      {volumes.map((v) => (
                        <tr key={v.name} className="border-b border-border last:border-0 hover:bg-bg-hover">
                          <td className="px-4 py-3 font-medium text-text">{v.name}</td>
                          <td className="px-4 py-3 text-text-secondary">{v.driver}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-text-muted">{v.mountpoint}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {logTarget && <LogPanel container={logTarget} onClose={() => setLogTarget(null)} />}
    </div>
  );
}
