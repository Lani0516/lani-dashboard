import { useState } from 'react';
import { FaCubes, FaArrowsRotate, FaGear, FaServer, FaSignal } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { MinecraftServerStatus } from '@shared/types/index.js';

function pingBars(latency: number) {
  // <150ms = 3 bars, <350ms = 2, else 1
  if (latency < 150) return 3;
  if (latency < 350) return 2;
  return 1;
}

function PlayerHead({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className="group/head flex items-center gap-1.5 bg-bg-hover hover:bg-bg-card border border-border pl-1 pr-2 py-1 rounded-md text-xs text-text transition-colors"
      title={name}
    >
      {failed ? (
        <span className="w-4 h-4 rounded-sm bg-primary/30 flex items-center justify-center text-[8px] font-bold uppercase text-primary">
          {name.slice(0, 1)}
        </span>
      ) : (
        <img
          src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/16`}
          alt={name}
          width={16}
          height={16}
          className="rounded-sm [image-rendering:pixelated]"
          onError={() => setFailed(true)}
        />
      )}
      <span className="truncate max-w-[90px]">{name}</span>
    </span>
  );
}

export function MinecraftWidget() {
  const [server, setServer] = useLocalStorage('minecraft-server', { host: 'localhost', port: '25565' });
  const [showSettings, setShowSettings] = useState(false);
  const addr = server.port ? `${server.host}:${server.port}` : server.host;
  const portQuery = server.port ? `&port=${server.port}` : '';
  const { data: status, loading, error, refetch } = useApi<MinecraftServerStatus>(
    `/minecraft/status?host=${server.host}${portQuery}`,
    15000
  );

  const online = status?.online;
  const bars = status?.online ? pingBars(status.latency) : 0;
  const playerPct = status?.online
    ? (status.players.online / Math.max(status.players.max, 1)) * 100
    : 0;

  return (
    <WidgetCard
      title="Minecraft"
      icon={<FaCubes />}
      status={loading ? 'loading' : online ? 'online' : 'offline'}
      actions={
        <>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`px-2 py-1 rounded bg-bg-hover flex items-center transition-colors ${
              showSettings ? 'text-primary' : 'text-text-muted hover:text-text'
            }`}
            title="Server settings"
          >
            <FaGear size={12} />
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
        {showSettings && (
          <div className="flex gap-2">
            <input
              className="flex-1 bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
              placeholder="Host"
              value={server.host}
              onChange={(e) => setServer({ ...server, host: e.target.value })}
            />
            <input
              className="w-20 bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
              placeholder="Port"
              value={server.port}
              onChange={(e) => setServer({ ...server, port: e.target.value })}
            />
          </div>
        )}

        {error && <div className="text-error text-xs">{error}</div>}

        {status && (
          <>
            {/* Hero banner */}
            <div
              className={`relative overflow-hidden rounded-xl p-3 border border-border ${
                online
                  ? 'bg-gradient-to-br from-success/25 via-bg-hover to-bg-hover'
                  : 'bg-gradient-to-br from-error/25 via-bg-hover to-bg-hover'
              }`}
            >
              <div
                className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl ${
                  online ? 'bg-success/20' : 'bg-error/20'
                }`}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex items-center justify-center w-9 h-9 rounded-lg [image-rendering:pixelated] ${
                      online ? 'bg-success/25 text-success' : 'bg-error/25 text-error'
                    }`}
                  >
                    <FaServer size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className={`text-sm font-bold ${online ? 'text-success' : 'text-error'}`}>
                      {online ? 'ONLINE' : 'OFFLINE'}
                    </div>
                    <div className="text-[11px] text-text-muted truncate font-mono">
                      {addr}
                    </div>
                  </div>
                </div>
                {online && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-end gap-0.5 h-4">
                      {[1, 2, 3].map((b) => (
                        <span
                          key={b}
                          className={`w-1 rounded-sm ${
                            b <= bars ? 'bg-success' : 'bg-border'
                          }`}
                          style={{ height: `${b * 33}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
                      <FaSignal size={9} />
                      {status.latency}ms
                    </div>
                  </div>
                )}
              </div>
              {online && status.version && (
                <div className="relative mt-2 inline-block text-[10px] font-mono text-text-muted bg-bg-hover border border-border px-1.5 py-0.5 rounded">
                  {status.version}
                </div>
              )}
            </div>

            {online && (
              <>
                {/* Players */}
                <div className="bg-bg-hover rounded-lg p-2.5">
                  <div className="flex justify-between items-baseline text-xs mb-1.5">
                    <span className="text-text-muted">Players</span>
                    <span className="text-text font-bold font-mono">
                      {status.players.online}
                      <span className="text-text-muted font-normal"> / {status.players.max}</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-success/70 to-success rounded-full transition-all duration-500"
                      style={{ width: `${playerPct}%` }}
                    />
                  </div>
                </div>

                {status.players.list.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs text-text-muted">Online now</div>
                    <div className="flex flex-wrap gap-1.5">
                      {status.players.list.map((p) => (
                        <PlayerHead key={p} name={p} />
                      ))}
                    </div>
                  </div>
                )}

                {status.motd && (
                  <div className="rounded-lg border border-border bg-bg-hover p-2">
                    <span className="block text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                      MOTD
                    </span>
                    <span className="text-xs text-text whitespace-pre-line">{status.motd}</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  );
}
