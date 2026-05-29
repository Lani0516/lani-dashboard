import { useState, useEffect, useRef } from 'react';
import { FaNetworkWired, FaArrowDown, FaArrowUp } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { SystemStats } from '@shared/types/index.js';

const MAX_POINTS = 40;

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1);
  return `${(bytesPerSec / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 100;
  const h = 28;
  if (values.length < 2) {
    return <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none" />;
  }
  const max = Math.max(...values, 1);
  const step = w / (MAX_POINTS - 1);
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * h}`);
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${(values.length - 1) * step},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity={0.15} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function NetworkWidget() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const { data: initialStats } = useApi<SystemStats>('/system/stats');
  const { lastMessage } = useWebSocket();
  const rxHist = useRef<number[]>([]);
  const txHist = useRef<number[]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    if (initialStats && !stats) setStats(initialStats);
  }, [initialStats, stats]);

  useEffect(() => {
    if (lastMessage?.type === 'system:stats') {
      setStats(lastMessage.data as SystemStats);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!stats) return;
    const rx = stats.network.interfaces.reduce((s, i) => s + i.rxSpeed, 0);
    const tx = stats.network.interfaces.reduce((s, i) => s + i.txSpeed, 0);
    rxHist.current = [...rxHist.current, rx].slice(-MAX_POINTS);
    txHist.current = [...txHist.current, tx].slice(-MAX_POINTS);
    force((n) => n + 1);
  }, [stats]);

  if (!stats) {
    return (
      <WidgetCard title="Network" icon={<FaNetworkWired />} status="loading">
        <div className="text-text-muted text-sm">Loading...</div>
      </WidgetCard>
    );
  }

  const rxNow = stats.network.interfaces.reduce((s, i) => s + i.rxSpeed, 0);
  const txNow = stats.network.interfaces.reduce((s, i) => s + i.txSpeed, 0);

  return (
    <WidgetCard title="Network" icon={<FaNetworkWired />} status="online">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-bg-hover p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <FaArrowDown size={10} className="text-success" /> Download
            </div>
            <div className="text-lg font-bold text-text font-mono">{formatSpeed(rxNow)}</div>
            <Sparkline values={rxHist.current} color="var(--color-success)" />
          </div>
          <div className="rounded-lg bg-bg-hover p-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
              <FaArrowUp size={10} className="text-primary" /> Upload
            </div>
            <div className="text-lg font-bold text-text font-mono">{formatSpeed(txNow)}</div>
            <Sparkline values={txHist.current} color="var(--color-primary)" />
          </div>
        </div>

        <div className="space-y-1">
          {stats.network.interfaces.map((iface) => (
            <div key={iface.name} className="flex justify-between text-xs font-mono">
              <span className="text-text-muted">{iface.name}</span>
              <span className="text-text inline-flex items-center gap-1">
                <FaArrowDown size={9} className="text-success" />{formatSpeed(iface.rxSpeed)}
                <FaArrowUp size={9} className="text-primary ml-1" />{formatSpeed(iface.txSpeed)}
              </span>
            </div>
          ))}
          {stats.network.interfaces.length === 0 && (
            <div className="text-text-muted text-xs">No active interfaces</div>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
