import { useState } from 'react';
import { FaCubes, FaArrowsRotate } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { MinecraftServerStatus } from '@shared/types/index.js';

export function MinecraftWidget() {
  const [server, setServer] = useState({ host: 'localhost', port: '25565' });
  const { data: status, loading, error, refetch } = useApi<MinecraftServerStatus>(
    `/minecraft/status?host=${server.host}&port=${server.port}`,
    15000
  );

  return (
    <WidgetCard
      title="Minecraft"
      icon={<FaCubes />}
      status={loading ? 'loading' : status?.online ? 'online' : 'offline'}
      actions={
        <button
          onClick={refetch}
          className="text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover flex items-center"
        >
          <FaArrowsRotate size={12} />
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
            placeholder="Host"
            value={server.host}
            onChange={(e) => setServer({ ...server, host: e.target.value })}
          />
          <input
            className="w-16 bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
            placeholder="Port"
            value={server.port}
            onChange={(e) => setServer({ ...server, port: e.target.value })}
          />
        </div>

        {error && <div className="text-error text-xs">{error}</div>}

        {status && (
          <>
            <div className={`text-center py-2 rounded-lg ${status.online ? 'bg-success/10' : 'bg-error/10'}`}>
              <div className={`text-sm font-bold ${status.online ? 'text-success' : 'text-error'}`}>
                {status.online ? 'ONLINE' : 'OFFLINE'}
              </div>
              {status.online && (
                <div className="text-xs text-text-muted">{status.version} · {status.latency}ms</div>
              )}
            </div>

            {status.online && (
              <>
                <div className="bg-bg-hover rounded-lg p-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">Players</span>
                    <span className="text-text font-bold">{status.players.online} / {status.players.max}</span>
                  </div>
                  <div className="w-full h-2 bg-bg rounded-full">
                    <div
                      className="h-full bg-success rounded-full transition-all"
                      style={{ width: `${(status.players.online / Math.max(status.players.max, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {status.players.list.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-text-muted">Online Players</div>
                    <div className="flex flex-wrap gap-1">
                      {status.players.list.map((p) => (
                        <span key={p} className="bg-bg-hover px-2 py-0.5 rounded text-xs text-text">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {status.motd && (
                  <div className="text-xs text-text-muted">
                    <span className="block text-[10px] uppercase text-text-muted mb-0.5">MOTD</span>
                    {status.motd}
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
