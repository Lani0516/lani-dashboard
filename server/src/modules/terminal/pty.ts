import * as pty from 'node-pty';
import { homedir } from 'os';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import type { WebSocket } from 'ws';
import { FILES_ROOT } from '../files/service.js';

const SHELL = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : 'bash');

// Resolve the current working directory of a running process, cross-platform.
function getCwd(pid: number): Promise<string | null> {
  if (process.platform === 'linux') {
    return fs.readlink(`/proc/${pid}/cwd`).catch(() => null);
  }
  if (process.platform === 'darwin') {
    return new Promise((resolve) => {
      execFile('lsof', ['-a', '-d', 'cwd', '-p', String(pid), '-Fn'], (err, out) => {
        if (err) return resolve(null);
        const line = out.split('\n').find((l) => l.startsWith('n'));
        resolve(line ? line.slice(1) : null);
      });
    });
  }
  return Promise.resolve(null);
}

export function attachTerminal(ws: WebSocket) {
  const term = pty.spawn(SHELL, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.FILES_ROOT || FILES_ROOT || homedir(),
    env: process.env as Record<string, string>,
  });

  // Send pty output as binary; reserve string frames for JSON control messages.
  term.onData((data) => {
    if (ws.readyState === 1) ws.send(Buffer.from(data, 'utf8'));
  });

  // Poll shell cwd, push to client when it changes so the file tree can follow.
  let lastCwd: string | null = null;
  const cwdTimer = setInterval(async () => {
    if (ws.readyState !== 1) return;
    const cwd = await getCwd(term.pid);
    if (cwd && cwd !== lastCwd) {
      lastCwd = cwd;
      ws.send(JSON.stringify({ type: 'cwd', path: cwd }));
    }
  }, 1000);

  term.onExit(({ exitCode }) => {
    clearInterval(cwdTimer);
    if (ws.readyState === 1) {
      ws.send(Buffer.from(`\r\n\x1b[33m[process exited: ${exitCode}]\x1b[0m\r\n`, 'utf8'));
      ws.close();
    }
  });

  ws.on('message', (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === 'input' && typeof msg.data === 'string') {
      term.write(msg.data);
    } else if (msg.type === 'resize' && msg.cols > 0 && msg.rows > 0) {
      try {
        term.resize(msg.cols, msg.rows);
      } catch {}
    }
  });

  ws.on('close', () => {
    clearInterval(cwdTimer);
    try {
      term.kill();
    } catch {}
  });
}
