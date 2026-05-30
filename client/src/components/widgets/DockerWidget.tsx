import { useState } from 'react';
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
} from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
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

// Plain mutation helper — mirrors services/api.ts request() without editing it.
async function mutate(path: string): Promise<void> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'Bad response' }));
  if (!json.ok) throw new Error(json.error || 'Request failed');
}

async function fetchLogs(id: string): Promise<string> {
  const res = await fetch(`/api/docker/containers/${id}/logs?tail=200`, {
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({ ok: false }));
  if (!json.ok) throw new Error(json.error || 'Failed to load logs');
  return json.data?.logs || '';
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

function ContainerRow({ c, busy, onAction, onLogs }: {
  c: DockerContainer;
  busy: boolean;
  onAction: (id: string, action: 'start' | 'stop' | 'restart') => void;
  onLogs: (c: DockerContainer) => void;
}) {
  const running = c.state === 'running';
  const memPct = c.memLimit > 0 ? (c.memUsage / c.memLimit) * 100 : 0;
  return (
    <div className="bg-bg-hover rounded-lg p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${running ? 'bg-success' : 'bg-error'}`} />
            <span className="text-text text-sm font-medium truncate">{c.name}</span>
          </div>
          <div className="text-[11px] text-text-muted font-mono truncate">{c.image}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {running ? (
            <>
              <button
                disabled={busy}
                onClick={() => onAction(c.id, 'restart')}
                className="text-text-muted hover:text-primary px-1.5 py-1 rounded bg-bg-card disabled:opacity-40 transition-colors"
                title="Restart"
              >
                <FaRotateRight size={11} />
              </button>
              <button
                disabled={busy}
                onClick={() => onAction(c.id, 'stop')}
                className="text-text-muted hover:text-error px-1.5 py-1 rounded bg-bg-card disabled:opacity-40 transition-colors"
                title="Stop"
              >
                <FaStop size={11} />
              </button>
            </>
          ) : (
            <button
              disabled={busy}
              onClick={() => onAction(c.id, 'start')}
              className="text-text-muted hover:text-success px-1.5 py-1 rounded bg-bg-card disabled:opacity-40 transition-colors"
              title="Start"
            >
              <FaPlay size={11} />
            </button>
          )}
          <button
            onClick={() => onLogs(c)}
            className="text-text-muted hover:text-text px-1.5 py-1 rounded bg-bg-card transition-colors"
            title="Logs"
          >
            <FaFileLines size={11} />
          </button>
        </div>
      </div>
      {running && (
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-muted font-mono">
          <span>CPU {c.cpuPercent.toFixed(1)}%</span>
          <span>
            MEM {fmtBytes(c.memUsage)}
            {c.memLimit > 0 && ` (${memPct.toFixed(0)}%)`}
          </span>
        </div>
      )}
      {!running && <div className="text-[11px] text-text-muted mt-1.5 truncate">{c.status}</div>}
    </div>
  );
}

export function DockerWidget() {
  const { data, loading, error, refetch } = useApi<DockerStatus>('/docker/status', 10000);
  const [tab, setTab] = useState<Tab>('containers');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [images, setImages] = useState<DockerImage[] | null>(null);
  const [volumes, setVolumes] = useState<DockerVolume[] | null>(null);
  const [pruning, setPruning] = useState(false);

  const [logTarget, setLogTarget] = useState<DockerContainer | null>(null);
  const [logText, setLogText] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  const available = !!data?.available;
  const online = available && !error;

  async function doAction(id: string, action: 'start' | 'stop' | 'restart') {
    setBusyId(id);
    setActionError(null);
    try {
      await mutate(`/docker/containers/${id}/${action}`);
      await refetch();
    } catch (e) {
      setActionError(String(e instanceof Error ? e.message : e));
    } finally {
      setBusyId(null);
    }
  }

  async function loadImages() {
    setTab('images');
    if (images) return;
    try {
      const res = await fetch('/api/docker/images', { headers: authHeaders() });
      const json = await res.json();
      if (json.ok) setImages(json.data?.images || []);
    } catch { /* ignore */ }
  }

  async function loadVolumes() {
    setTab('volumes');
    if (volumes) return;
    try {
      const res = await fetch('/api/docker/volumes', { headers: authHeaders() });
      const json = await res.json();
      if (json.ok) setVolumes(json.data?.volumes || []);
    } catch { /* ignore */ }
  }

  async function doPrune() {
    setPruning(true);
    setActionError(null);
    try {
      await mutate('/docker/images/prune');
      setImages(null);
      await loadImages();
    } catch (e) {
      setActionError(String(e instanceof Error ? e.message : e));
    } finally {
      setPruning(false);
    }
  }

  async function openLogs(c: DockerContainer) {
    setLogTarget(c);
    setLogLoading(true);
    setLogText('');
    try {
      setLogText(await fetchLogs(c.id));
    } catch (e) {
      setLogText(String(e instanceof Error ? e.message : e));
    } finally {
      setLogLoading(false);
    }
  }

  const tabBtn = (t: Tab, label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <WidgetCard
      title="Docker"
      icon={<FaDocker />}
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
        {!available && !loading && (
          <div className="text-text-muted text-xs">
            {data?.error || 'Docker unavailable — /var/run/docker.sock not found.'}
          </div>
        )}

        {actionError && <div className="text-error text-xs">{actionError}</div>}

        {logTarget && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text font-medium truncate">Logs: {logTarget.name}</span>
              <button
                onClick={() => setLogTarget(null)}
                className="text-text-muted hover:text-text text-xs px-2 py-0.5 rounded bg-bg-hover"
              >
                Close
              </button>
            </div>
            <pre className="bg-bg-hover border border-border rounded p-2 text-[10px] text-text-muted font-mono whitespace-pre-wrap max-h-48 overflow-auto">
              {logLoading ? 'Loading…' : logText || '(no output)'}
            </pre>
          </div>
        )}

        {available && !logTarget && (
          <>
            <div className="flex gap-1 bg-bg-hover border border-border rounded p-0.5">
              {tabBtn('containers', 'Containers', <FaBoxesStacked size={11} />, () => setTab('containers'))}
              {tabBtn('images', 'Images', <FaLayerGroup size={11} />, loadImages)}
              {tabBtn('volumes', 'Volumes', <FaHardDrive size={11} />, loadVolumes)}
            </div>

            {tab === 'containers' && (
              <div className="space-y-2">
                {data!.containers.length === 0 && (
                  <div className="text-text-muted text-xs">No containers.</div>
                )}
                {data!.containers.map((c) => (
                  <ContainerRow
                    key={c.id}
                    c={c}
                    busy={busyId === c.id}
                    onAction={doAction}
                    onLogs={openLogs}
                  />
                ))}
              </div>
            )}

            {tab === 'images' && (
              <div className="space-y-2">
                <button
                  onClick={doPrune}
                  disabled={pruning}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-text-muted hover:text-error bg-bg-hover border border-border rounded px-2 py-1 disabled:opacity-40 transition-colors"
                >
                  <FaTrash size={11} /> {pruning ? 'Pruning…' : 'Prune unused images'}
                </button>
                {(images || []).length === 0 && (
                  <div className="text-text-muted text-xs">No images.</div>
                )}
                {(images || []).map((img) => (
                  <div key={img.id} className="bg-bg-hover rounded-lg p-2 flex items-center justify-between gap-2">
                    <span className="text-text text-xs font-mono truncate">{img.tag}</span>
                    <span className="text-text-muted text-[11px] font-mono shrink-0">{fmtBytes(img.size)}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'volumes' && (
              <div className="space-y-2">
                {(volumes || []).length === 0 && (
                  <div className="text-text-muted text-xs">No volumes.</div>
                )}
                {(volumes || []).map((v) => (
                  <div key={v.name} className="bg-bg-hover rounded-lg p-2">
                    <div className="text-text text-xs font-medium truncate">{v.name}</div>
                    <div className="text-text-muted text-[11px] font-mono truncate">{v.mountpoint}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  );
}
