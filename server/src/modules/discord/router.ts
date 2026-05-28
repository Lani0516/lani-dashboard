import { Router } from 'express';
import { getGuildInfo } from './service.js';
import { configManager } from '../../config/config-manager.js';

export const discordRouter = Router();

discordRouter.get('/', async (_req, res) => {
  try {
    const config = configManager.get();
    const token = config.discordBotToken || process.env.DISCORD_BOT_TOKEN;
    const guildId = config.discordGuildId || process.env.DISCORD_GUILD_ID;

    if (!token || !guildId) {
      res.json({
        ok: false,
        error: 'Discord bot token or guild ID not configured',
        timestamp: Date.now(),
      });
      return;
    }

    const info = await getGuildInfo(token, guildId);
    res.json({ ok: true, data: info, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e), timestamp: Date.now() });
  }
});
