import { FaDiscord, FaVolumeHigh, FaHashtag } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { DiscordGuildInfo } from '@shared/types/index.js';

export function DiscordWidget() {
  const { data: guild, loading, error } = useApi<DiscordGuildInfo>('/discord', 30000);

  if (error) {
    return (
      <WidgetCard title="Discord" icon={<FaDiscord />} status="error">
        <div className="text-text-muted text-xs">{error}</div>
      </WidgetCard>
    );
  }

  if (loading || !guild) {
    return (
      <WidgetCard title="Discord" icon={<FaDiscord />} status="loading">
        <div className="text-text-muted text-sm">Loading...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Discord" icon={<FaDiscord />} status="online">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {guild.icon && (
            <img src={guild.icon} alt="" className="w-10 h-10 rounded-full" />
          )}
          <div>
            <div className="text-sm font-semibold text-text">{guild.name}</div>
            <div className="text-xs text-text-muted">Boost Level {guild.boostLevel}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-hover rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-text">{guild.memberCount}</div>
            <div className="text-xs text-text-muted">Members</div>
          </div>
          <div className="bg-bg-hover rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-success">{guild.onlineCount}</div>
            <div className="text-xs text-text-muted">Online</div>
          </div>
        </div>

        {guild.channels.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-text-muted">Channels ({guild.channels.length})</div>
            <div className="max-h-32 overflow-auto space-y-0.5">
              {guild.channels.slice(0, 15).map((ch) => (
                <div key={ch.id} className="text-xs text-text flex items-center gap-1">
                  <span className="text-text-muted flex items-center">{ch.type === 2 ? <FaVolumeHigh size={10} /> : <FaHashtag size={10} />}</span>
                  {ch.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
