import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { configManager } from './config/config-manager.js';
import { systemRouter } from './modules/system/router.js';
import { aiTokensRouter } from './modules/ai-tokens/router.js';
import { discordRouter } from './modules/discord/router.js';
import { minecraftRouter } from './modules/minecraft/router.js';
import { sftpRouter } from './modules/minecraft/sftp-router.js';
import { vpnRouter } from './modules/vpn/router.js';
import { wolRouter } from './modules/wol/router.js';
import { configRouter } from './config/router.js';
import { startPolling } from './polling.js';
import { broadcastUpdate } from './ws.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('../client/dist'));

app.use('/api/system', systemRouter);
app.use('/api/ai-tokens', aiTokensRouter);
app.use('/api/discord', discordRouter);
app.use('/api/minecraft', minecraftRouter);
app.use('/api/sftp', sftpRouter);
app.use('/api/vpn', vpnRouter);
app.use('/api/wol', wolRouter);
app.use('/api/config', configRouter);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
});

export { wss };

const PORT = process.env.PORT || 3001;

await configManager.load();
startPolling(wss);

server.listen(PORT, () => {
  console.log(`Dashboard server running on :${PORT}`);
});
