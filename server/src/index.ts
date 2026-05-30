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
import { filesRouter } from './modules/files/router.js';
import { adblockRouter } from './modules/adblock/router.js';
import { sitesRouter } from './modules/sites/router.js';
import { configRouter } from './config/router.js';
import { startPolling } from './polling.js';
import { authMiddleware, authStatus, verifyWsUpgrade } from './auth.js';
import { attachTerminal } from './modules/terminal/pty.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static('../client/dist'));

// Public: lets the client know whether to prompt for a token.
app.get('/api/auth/status', (_req, res) => {
  res.json({ ok: true, data: authStatus(), timestamp: Date.now() });
});

// Everything below /api requires the token (no-op when DASHBOARD_TOKEN is unset).
app.use('/api', authMiddleware);

app.use('/api/system', systemRouter);
app.use('/api/ai-tokens', aiTokensRouter);
app.use('/api/discord', discordRouter);
app.use('/api/minecraft', minecraftRouter);
app.use('/api/sftp', sftpRouter);
app.use('/api/vpn', vpnRouter);
app.use('/api/wol', wolRouter);
app.use('/api/files', filesRouter);
app.use('/api/adblock', adblockRouter);
app.use('/api/sites', sitesRouter);
app.use('/api/config', configRouter);

// Two WS endpoints sharing one HTTP server, routed by path on upgrade.
const wss = new WebSocketServer({ noServer: true });
const wssTerminal = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
});

wssTerminal.on('connection', (ws) => {
  attachTerminal(ws);
});

server.on('upgrade', (req, socket, head) => {
  if (!verifyWsUpgrade(req)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  const path = (req.url || '').split('?')[0];
  if (path === '/ws/terminal') {
    wssTerminal.handleUpgrade(req, socket, head, (ws) => wssTerminal.emit('connection', ws, req));
  } else if (path === '/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

export { wss };

const PORT = process.env.PORT || 3001;

await configManager.load();
startPolling(wss);

server.listen(PORT, () => {
  console.log(`Dashboard server running on :${PORT}`);
});
