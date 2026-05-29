import { useState, useEffect } from 'react';
import { FaDesktop, FaArrowDown, FaArrowUp } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { SystemStats, ConnectedDevice } from '@shared/types/index.js';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ProgressBar({ value, max = 100, color = 'bg-primary' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SystemMonitor() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const { data: initialStats } = useApi<SystemStats>('/system/stats');
  const { data: devices } = useApi<ConnectedDevice[]>('/system/devices', 30000);
  const { lastMessage } = useWebSocket();
  const [showDevices, setShowDevices] = useState(false);

  useEffect(() => {
    if (initialStats && !stats) setStats(initialStats);
  }, [initialStats, stats]);

  useEffect(() => {
    if (lastMessage?.type === 'system:stats') {
      setStats(lastMessage.data as SystemStats);
    }
  }, [lastMessage]);

  if (!stats) {
    return (
      <WidgetCard title="System" icon={<FaDesktop />} status="loading">
        <div className="text-text-muted text-sm">Loading...</div>
      </WidgetCard>
    );
  }

  const memPct = Math.round((stats.memory.used / stats.memory.total) * 100);

  return (
    <WidgetCard
      title="System Monitor"
      icon={<FaDesktop />}
      status="online"
      actions={
        <button
          onClick={() => setShowDevices(!showDevices)}
          className="text-xs text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover"
        >
          {showDevices ? 'Stats' : `Devices (${devices?.length ?? 0})`}
        </button>
      }
    >
      {showDevices ? (
        <div className="space-y-2">
          {(devices || []).map((d, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${d.online ? 'bg-success' : 'bg-error'}`} />
                <span className="text-text">{d.hostname || d.ip}</span>
              </div>
              <span className="text-text-muted font-mono">{d.mac}</span>
            </div>
          ))}
          {(!devices || devices.length === 0) && (
            <div className="text-text-muted text-xs">No devices found</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">CPU</span>
              <span className="text-text">{stats.cpu.usage}%{stats.cpu.temp ? ` · ${stats.cpu.temp}°C` : ''}</span>
            </div>
            <ProgressBar value={stats.cpu.usage} color={stats.cpu.usage > 80 ? 'bg-error' : stats.cpu.usage > 50 ? 'bg-warning' : 'bg-primary'} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">Memory</span>
              <span className="text-text">{formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)} ({memPct}%)</span>
            </div>
            <ProgressBar value={memPct} color={memPct > 80 ? 'bg-error' : memPct > 50 ? 'bg-warning' : 'bg-secondary'} />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">Load</span>
              <span className="text-text">{stats.loadAvg.map(l => l.toFixed(2)).join(' / ')}</span>
            </div>
            <ProgressBar value={stats.loadAvg[0]} max={stats.cpu.cores} color="bg-accent" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-text-muted">Uptime</span>
              <div className="text-text font-mono">{formatUptime(stats.uptime)}</div>
            </div>
            <div>
              <span className="text-text-muted">CPU</span>
              <div className="text-text font-mono text-[10px]">{stats.cpu.model.slice(0, 30)}</div>
            </div>
          </div>

          {stats.network.interfaces.length > 0 && (
            <div className="space-y-1">
              <span className="text-text-muted text-xs">Network</span>
              {stats.network.interfaces.map((iface) => (
                <div key={iface.name} className="flex justify-between text-xs font-mono">
                  <span className="text-text-muted">{iface.name}</span>
                  <span className="text-text inline-flex items-center gap-1">
                    <FaArrowDown size={9} />{formatBytes(iface.rxSpeed)}/s
                    <FaArrowUp size={9} className="ml-1" />{formatBytes(iface.txSpeed)}/s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
