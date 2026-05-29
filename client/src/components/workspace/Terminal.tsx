import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { getToken } from '../../services/api';
import { xtermTheme, terminalFont, terminalFontSize, onThemeChange } from './theme';

interface TerminalProps {
  onCwd?: (path: string) => void;
}

export function Terminal({ onCwd }: TerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onCwdRef = useRef(onCwd);
  onCwdRef.current = onCwd;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new XTerm({
      fontFamily: terminalFont(),
      fontSize: terminalFontSize(),
      cursorBlink: true,
      theme: xtermTheme(),
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();

    const offTheme = onThemeChange(() => {
      term.options.theme = xtermTheme();
      term.options.fontFamily = terminalFont();
      term.options.fontSize = terminalFontSize();
      try {
        fit.fit();
      } catch {}
    });

    const token = getToken();
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${proto}//${location.host}/ws/terminal${token ? `?token=${encodeURIComponent(token)}` : ''}`
    );
    ws.binaryType = 'arraybuffer';

    const sendResize = () => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onopen = () => {
      term.writeln('\x1b[90mconnected\x1b[0m');
      sendResize();
    };
    ws.onmessage = (e) => {
      // Binary = raw pty output; string = JSON control message (e.g. cwd).
      if (typeof e.data !== 'string') {
        term.write(new Uint8Array(e.data));
        return;
      }
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'cwd' && typeof msg.path === 'string') onCwdRef.current?.(msg.path);
      } catch {
        term.write(e.data);
      }
    };
    ws.onclose = () => term.writeln('\r\n\x1b[31mdisconnected\x1b[0m');

    const dataSub = term.onData((d) => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'input', data: d }));
    });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        sendResize();
      } catch {}
    });
    ro.observe(host);

    return () => {
      offTheme();
      ro.disconnect();
      dataSub.dispose();
      ws.close();
      term.dispose();
    };
  }, []);

  return <div ref={hostRef} className="w-full h-full" />;
}
