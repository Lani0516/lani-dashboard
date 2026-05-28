import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { VPNStatus } from '@shared/types/index.js';

export function VPNWidget() {
  const { data: status } = useApi<VPNStatus>('/vpn/status', 10000);

  return (
    <WidgetCard title="VPN" icon="🔒" status={status?.connected ? 'online' : 'offline'}>
      <div className="space-y-3">
        <div className={`text-center py-3 rounded-lg ${status?.connected ? 'bg-success/10' : 'bg-bg-hover'}`}>
          <div className={`text-sm font-bold ${status?.connected ? 'text-success' : 'text-text-muted'}`}>
            {status?.connected ? 'Connected' : 'Not Configured'}
          </div>
          {status?.provider && (
            <div className="text-xs text-text-muted mt-1 capitalize">{status.provider}</div>
          )}
        </div>

        {status?.peers && status.peers.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-muted">Peers</div>
            {status.peers.map((peer) => (
              <div key={peer.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${peer.online ? 'bg-success' : 'bg-error'}`} />
                  <span className="text-text">{peer.name}</span>
                </div>
                <span className="text-text-muted font-mono">{peer.ip}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-text-muted text-center py-2">
          VPN management coming soon
        </div>
      </div>
    </WidgetCard>
  );
}
