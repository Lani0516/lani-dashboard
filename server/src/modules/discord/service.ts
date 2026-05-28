import type { DiscordGuildInfo } from '../../../../shared/types/index.js';

const DISCORD_API = 'https://discord.com/api/v10';

export async function getGuildInfo(botToken: string, guildId: string): Promise<DiscordGuildInfo> {
  const headers = { Authorization: `Bot ${botToken}` };

  const [guildRes, channelsRes] = await Promise.all([
    fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, { headers }),
    fetch(`${DISCORD_API}/guilds/${guildId}/channels`, { headers }),
  ]);

  if (!guildRes.ok) {
    throw new Error(`Discord API error: ${guildRes.status}`);
  }

  const guild = (await guildRes.json()) as any;
  const channels = channelsRes.ok ? ((await channelsRes.json()) as any[]) : [];

  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon
      ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
      : undefined,
    memberCount: guild.approximate_member_count ?? 0,
    onlineCount: guild.approximate_presence_count ?? 0,
    channels: channels.map((ch: any) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
    })),
    boostLevel: guild.premium_tier ?? 0,
  };
}
