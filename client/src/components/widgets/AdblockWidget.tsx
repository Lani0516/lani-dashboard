import { useState } from 'react';
import { FaShieldHalved, FaArrowsRotate, FaGear, FaBan, FaGlobe } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { AdblockStats } from '@shared/types/index.js';

interface AdblockSettings {
  host: string;
  version: 'v5' | 'v6';
  token: string;
}

function fmt(n: number) {
  return n.toLocaleString();
}

export function AdblockWidget() {
  const [settings, setSettings] = useLocalStorage<AdblockSettings>('adblock-settings', {
    host: '',
    version: 'v6',
    token: '',
  });
  const [showSettings, setShowSettings] = useState(!settings.host);

  const query = `/adblock/stats?host=${encodeURIComponent(settings.host)}&version=${settings.version}&token=${encodeURIComponent(settings.token)}`;
  const { data, loading, error, refetch } = useApi<AdblockStats>(
    settings.host ? query : '/adblock/stats?host=',
    30000
  );

  const online = !!data?.online && !error;

  return (
    <WidgetCard
      title="Ad Block"
      icon={<FaShieldHalved />}
      status={loading ? 'loading' : online ? 'online' : 'offline'}
      actions={
        <>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className={`px-2 py-1 rounded bg-bg-hover flex items-center transition-colors ${
              showSettings ? 'text-primary' : 'text-text-muted hover:text-text'
            }`}
            title="Settings"
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
          <div className="space-y-2">
            <input
              className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
              placeholder="Host (e.g. 192.168.1.1 or http://pi.hole)"
              value={settings.host}
              onChange={(e) => setSettings({ ...settings, host: e.target.value })}
            />
            <input
              type="password"
              className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
              placeholder={settings.version === 'v6' ? 'App password' : 'API token'}
              value={settings.token}
              onChange={(e) => setSettings({ ...settings, token: e.target.value })}
            />
            <div className="flex gap-1 bg-bg-hover border border-border rounded p-0.5">
              {(['v6', 'v5'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setSettings({ ...settings, version: v })}
                  className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    settings.version === v
                      ? 'bg-primary text-white'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Pi-hole {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && settings.host && <div className="text-error text-xs">{error}</div>}
        {!settings.host && !showSettings && (
          <div className="text-text-muted text-xs">Configure Pi-hole in settings.</div>
        )}

        {data && online && (
          <>
            <div className="relative overflow-hidden rounded-xl p-3 border border-border bg-gradient-to-br from-primary/25 via-bg-hover to-bg-hover">
              <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl bg-primary/20" />
              <div className="relative">
                <div className="text-[11px] text-text-muted uppercase tracking-wider">
                  Blocked today
                </div>
                <div className="text-3xl font-bold text-primary font-mono leading-tight">
                  {data.blockPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-text-muted font-mono mt-0.5">
                  {fmt(data.blockedToday)} of {fmt(data.queriesToday)} queries
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-bg-hover rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-0.5">
                  <FaBan size={10} /> Blocked
                </div>
                <div className="text-text font-bold font-mono text-sm">{fmt(data.blockedToday)}</div>
              </div>
              <div className="bg-bg-hover rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted mb-0.5">
                  <FaGlobe size={10} /> Queries
                </div>
                <div className="text-text font-bold font-mono text-sm">{fmt(data.queriesToday)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Blocklist: {fmt(data.domainsOnBlocklist)} domains</span>
              <span className={data.blockingEnabled ? 'text-success' : 'text-error'}>
                {data.blockingEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>
          </>
        )}
      </div>
    </WidgetCard>
  );
}
