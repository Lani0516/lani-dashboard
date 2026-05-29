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
import { ClockWidget } from './components/widgets/ClockWidget';
import { FaDesktop, FaRobot, FaCubes, FaLock, FaBolt, FaFolder, FaRegClock, FaPenToSquare, FaArrowsRotate, FaXmark, FaPlus, FaDiscord } from 'react-icons/fa6';
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
    { i: 'clock', x: 6, y: 7, w: 4, h: 3 },
  ],
  md: [
    { i: 'system', x: 0, y: 0, w: 5, h: 4 },
    { i: 'ai-tokens', x: 5, y: 0, w: 5, h: 4 },
    { i: 'discord', x: 0, y: 4, w: 5, h: 4 },
    { i: 'minecraft', x: 5, y: 4, w: 5, h: 4 },
    { i: 'vpn', x: 0, y: 8, w: 5, h: 3 },
    { i: 'wol', x: 5, y: 8, w: 5, h: 3 },
    { i: 'sftp', x: 0, y: 11, w: 10, h: 5 },
    { i: 'clock', x: 0, y: 16, w: 5, h: 3 },
  ],
  sm: [
    { i: 'system', x: 0, y: 0, w: 6, h: 4 },
    { i: 'ai-tokens', x: 0, y: 4, w: 6, h: 4 },
    { i: 'discord', x: 0, y: 8, w: 6, h: 4 },
    { i: 'minecraft', x: 0, y: 12, w: 6, h: 4 },
    { i: 'vpn', x: 0, y: 16, w: 6, h: 3 },
    { i: 'wol', x: 0, y: 19, w: 6, h: 3 },
    { i: 'sftp', x: 0, y: 22, w: 6, h: 5 },
    { i: 'clock', x: 0, y: 27, w: 6, h: 3 },
  ],
};

interface WidgetMeta {
  label: string;
  icon: React.ReactNode;
  render: () => React.JSX.Element;
}

const widgetMap: Record<string, WidgetMeta> = {
  system: { label: 'System Monitor', icon: <FaDesktop />, render: () => <SystemMonitor /> },
  'ai-tokens': { label: 'AI Tokens', icon: <FaRobot />, render: () => <AITokens /> },
  discord: { label: 'Discord', icon: <FaDiscord />, render: () => <DiscordWidget /> },
  minecraft: { label: 'Minecraft', icon: <FaCubes />, render: () => <MinecraftWidget /> },
  vpn: { label: 'VPN', icon: <FaLock />, render: () => <VPNWidget /> },
  wol: { label: 'Wake-on-LAN', icon: <FaBolt />, render: () => <WOLWidget /> },
  sftp: { label: 'SFTP Manager', icon: <FaFolder />, render: () => <SFTPManager /> },
  clock: { label: 'Clock', icon: <FaRegClock />, render: () => <ClockWidget /> },
};

const defaultWidgets = Object.keys(widgetMap).filter((k) => k !== 'ai-tokens');

const sizeDefaults: Record<string, Record<string, { w: number; h: number }>> = Object.fromEntries(
  Object.entries(defaultLayouts).map(([bp, items]) => [
    bp,
    Object.fromEntries(items.map((l) => [l.i, { w: l.w, h: l.h }])),
  ])
);

export function App() {
  const [theme, setTheme] = useState<ThemeId>('dark');
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [activeWidgets, setActiveWidgets] = useState<string[]>(defaultWidgets);
  const [editMode, setEditMode] = useState(false);
  const { connected } = useWebSocket();

  useEffect(() => {
    applyTheme(theme);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dashboard-layouts');
    if (saved) {
      try {
        setLayouts(JSON.parse(saved));
      } catch {}
    }
    const savedWidgets = localStorage.getItem('dashboard-widgets');
    if (savedWidgets) {
      try {
        const parsed = JSON.parse(savedWidgets);
        if (Array.isArray(parsed)) {
          setActiveWidgets(parsed.filter((k) => k in widgetMap));
        }
      } catch {}
    }
  }, []);

  const handleLayoutChange = (_: any, allLayouts: any) => {
    if (!editMode) return;
    setLayouts(allLayouts);
    localStorage.setItem('dashboard-layouts', JSON.stringify(allLayouts));
  };

  const saveWidgets = (next: string[]) => {
    setActiveWidgets(next);
    localStorage.setItem('dashboard-widgets', JSON.stringify(next));
  };

  const removeWidget = (key: string) => saveWidgets(activeWidgets.filter((k) => k !== key));

  const addWidget = (key: string) => {
    const nextLayouts: any = {};
    for (const bp of Object.keys(layouts) as (keyof typeof layouts)[]) {
      const existing = (layouts[bp] ?? []).filter((l: any) => l.i !== key);
      const size = sizeDefaults[bp]?.[key] ?? sizeDefaults.lg[key] ?? { w: 4, h: 4 };
      nextLayouts[bp] = [...existing, { i: key, x: 0, y: Infinity, ...size }];
    }
    setLayouts(nextLayouts);
    localStorage.setItem('dashboard-layouts', JSON.stringify(nextLayouts));
    saveWidgets([...activeWidgets, key]);
  };

  const resetLayout = () => {
    setLayouts(defaultLayouts);
    setActiveWidgets(defaultWidgets);
    localStorage.removeItem('dashboard-layouts');
    localStorage.removeItem('dashboard-widgets');
  };

  const hiddenWidgets = defaultWidgets.filter((k) => !activeWidgets.includes(k));

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-text">Lani Dashboard</h1>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-error'}`} />
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher current={theme} onChange={setTheme} />
          {editMode && (
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-text-secondary hover:text-text hover:border-primary transition-colors"
              title="Reset layout and panels to default"
            >
              <FaArrowsRotate size={13} />
              Reset
            </button>
          )}
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              editMode
                ? 'bg-primary text-white border-primary'
                : 'border-border text-text-secondary hover:text-text hover:border-primary'
            }`}
            title={editMode ? 'Done editing' : 'Edit layout'}
          >
            <FaPenToSquare size={13} />
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </header>

      {editMode && (
        <div className="bg-primary/10 border-b border-primary/30 px-6 py-2 text-xs text-primary">
          <div className="text-center mb-2">
            Edit mode — drag to move, drag corner to resize, click the corner button to remove. Click Done when finished.
          </div>
          {hiddenWidgets.length > 0 && (
            <div className="flex items-center justify-center flex-wrap gap-2">
              <span className="text-text-muted">Add:</span>
              {hiddenWidgets.map((key) => (
                <button
                  key={key}
                  onClick={() => addWidget(key)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-primary/40 text-text-secondary hover:text-text hover:bg-primary/10 transition-colors"
                >
                  <span className="flex items-center">{widgetMap[key].icon}</span>
                  {widgetMap[key].label}
                  <FaPlus className="text-primary" size={10} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <main className="p-4">
        <ResponsiveGridLayout
          className={`layout ${editMode ? 'edit-mode' : ''}`}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          isResizable={editMode}
          isDraggable={editMode}
          draggableCancel=".widget-remove"
        >
          {activeWidgets.map((key) => (
            <div key={key}>
              {editMode && (
                <button
                  onClick={() => removeWidget(key)}
                  className="widget-remove absolute -top-2 -right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-error text-white shadow hover:scale-110 transition-transform"
                  title={`Remove ${widgetMap[key].label}`}
                >
                  <FaXmark size={12} />
                </button>
              )}
              {widgetMap[key].render()}
            </div>
          ))}
        </ResponsiveGridLayout>
      </main>
    </div>
  );
}
