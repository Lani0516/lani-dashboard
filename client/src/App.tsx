import { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { ThemeSwitcher } from './components/ThemeSwitcher';
import { SystemMonitor } from './components/widgets/SystemMonitor';
import { AITokens } from './components/widgets/AITokens';
import { DiscordWidget } from './components/widgets/DiscordWidget';
import { MinecraftWidget } from './components/widgets/MinecraftWidget';
import { VPNWidget } from './components/widgets/VPNWidget';
import { WOLWidget } from './components/widgets/WOLWidget';
import { SFTPManager } from './components/widgets/SFTPManager';
import { applyTheme } from './themes/themes';
import { useWebSocket } from './hooks/useWebSocket';
import type { ThemeId } from '@shared/types/index.js';

const ResponsiveGridLayout = WidthProvider(Responsive);

const defaultLayouts = {
  lg: [
    { i: 'system', x: 0, y: 0, w: 4, h: 4 },
    { i: 'ai-tokens', x: 4, y: 0, w: 4, h: 4 },
    { i: 'discord', x: 8, y: 0, w: 4, h: 4 },
    { i: 'minecraft', x: 0, y: 4, w: 4, h: 4 },
    { i: 'vpn', x: 4, y: 4, w: 4, h: 3 },
    { i: 'wol', x: 8, y: 4, w: 4, h: 3 },
    { i: 'sftp', x: 0, y: 7, w: 6, h: 5 },
  ],
  md: [
    { i: 'system', x: 0, y: 0, w: 5, h: 4 },
    { i: 'ai-tokens', x: 5, y: 0, w: 5, h: 4 },
    { i: 'discord', x: 0, y: 4, w: 5, h: 4 },
    { i: 'minecraft', x: 5, y: 4, w: 5, h: 4 },
    { i: 'vpn', x: 0, y: 8, w: 5, h: 3 },
    { i: 'wol', x: 5, y: 8, w: 5, h: 3 },
    { i: 'sftp', x: 0, y: 11, w: 10, h: 5 },
  ],
  sm: [
    { i: 'system', x: 0, y: 0, w: 6, h: 4 },
    { i: 'ai-tokens', x: 0, y: 4, w: 6, h: 4 },
    { i: 'discord', x: 0, y: 8, w: 6, h: 4 },
    { i: 'minecraft', x: 0, y: 12, w: 6, h: 4 },
    { i: 'vpn', x: 0, y: 16, w: 6, h: 3 },
    { i: 'wol', x: 0, y: 19, w: 6, h: 3 },
    { i: 'sftp', x: 0, y: 22, w: 6, h: 5 },
  ],
};

const widgetMap: Record<string, () => React.JSX.Element> = {
  system: () => <SystemMonitor />,
  'ai-tokens': () => <AITokens />,
  discord: () => <DiscordWidget />,
  minecraft: () => <MinecraftWidget />,
  vpn: () => <VPNWidget />,
  wol: () => <WOLWidget />,
  sftp: () => <SFTPManager />,
};

export function App() {
  const [theme, setTheme] = useState<ThemeId>('dark');
  const [layouts, setLayouts] = useState(defaultLayouts);
  const { connected } = useWebSocket();

  useEffect(() => {
    applyTheme(theme);
  }, []);

  const savedLayouts = localStorage.getItem('dashboard-layouts');
  useEffect(() => {
    if (savedLayouts) {
      try {
        setLayouts(JSON.parse(savedLayouts));
      } catch {}
    }
  }, []);

  const handleLayoutChange = (_: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard-layouts', JSON.stringify(allLayouts));
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-text">Lani Dashboard</h1>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-error'}`} />
        </div>
        <ThemeSwitcher current={theme} onChange={setTheme} />
      </header>

      <main className="p-4">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".react-grid-item"
          isResizable
          isDraggable
        >
          {Object.entries(widgetMap).map(([key, Widget]) => (
            <div key={key}>
              <Widget />
            </div>
          ))}
        </ResponsiveGridLayout>
      </main>
    </div>
  );
}
