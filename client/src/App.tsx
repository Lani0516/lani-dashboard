import { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { ThemeSwitcher } from './components/ThemeSwitcher';
import { SystemMonitor } from './components/widgets/SystemMonitor';
import { DiscordWidget } from './components/widgets/DiscordWidget';
import { MinecraftWidget } from './components/widgets/MinecraftWidget';
import { VPNWidget } from './components/widgets/VPNWidget';
import { WOLWidget } from './components/widgets/WOLWidget';
import { SFTPManager } from './components/widgets/SFTPManager';
import { ClockWidget } from './components/widgets/ClockWidget';
import { NetworkWidget } from './components/widgets/NetworkWidget';
import { AdblockWidget } from './components/widgets/AdblockWidget';
import { FaDesktop, FaCubes, FaLock, FaBolt, FaFolder, FaRegClock, FaNetworkWired, FaPenToSquare, FaArrowsRotate, FaXmark, FaPlus, FaDiscord, FaGithub, FaEnvelope, FaFacebook, FaInstagram, FaGaugeHigh, FaCode, FaShieldHalved, FaGlobe } from 'react-icons/fa6';
import { applyTheme } from './themes/themes';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { Workspace } from './components/workspace/Workspace';
import { Sites } from './components/Sites';
import { Login } from './components/Login';
import { api, getToken } from './services/api';
import { applyFontPrefs, DEFAULT_FONT_PREFS, type FontPrefs } from './fonts';
import type { LocalSite, ThemePalette, ThemeMode } from '@shared/types/index.js';

type View = 'dashboard' | 'workspace' | 'sites';

const ResponsiveGridLayout = WidthProvider(Responsive);

const defaultLayouts = {
  lg: [
    { i: 'system', x: 0, y: 0, w: 4, h: 4 },
    { i: 'discord', x: 8, y: 0, w: 4, h: 4 },
    { i: 'minecraft', x: 0, y: 4, w: 4, h: 4 },
    { i: 'vpn', x: 4, y: 4, w: 4, h: 3 },
    { i: 'wol', x: 8, y: 4, w: 4, h: 3 },
    { i: 'sftp', x: 0, y: 7, w: 6, h: 5 },
    { i: 'clock', x: 6, y: 7, w: 4, h: 3 },
    { i: 'network', x: 6, y: 10, w: 4, h: 4 },
    { i: 'adblock', x: 10, y: 7, w: 4, h: 5 },
  ],
  sm: [
    { i: 'system', x: 0, y: 0, w: 6, h: 4 },
    { i: 'discord', x: 0, y: 8, w: 6, h: 4 },
    { i: 'minecraft', x: 0, y: 12, w: 6, h: 4 },
    { i: 'vpn', x: 0, y: 16, w: 6, h: 3 },
    { i: 'wol', x: 0, y: 19, w: 6, h: 3 },
    { i: 'sftp', x: 0, y: 22, w: 6, h: 5 },
    { i: 'clock', x: 0, y: 27, w: 6, h: 3 },
    { i: 'network', x: 0, y: 30, w: 6, h: 4 },
    { i: 'adblock', x: 0, y: 34, w: 6, h: 5 },
  ],
};

interface WidgetMeta {
  label: string;
  icon: React.ReactNode;
  render: () => React.JSX.Element;
}

const widgetMap: Record<string, WidgetMeta> = {
  system: { label: 'System Monitor', icon: <FaDesktop />, render: () => <SystemMonitor /> },
  discord: { label: 'Discord', icon: <FaDiscord />, render: () => <DiscordWidget /> },
  minecraft: { label: 'Minecraft', icon: <FaCubes />, render: () => <MinecraftWidget /> },
  vpn: { label: 'VPN', icon: <FaLock />, render: () => <VPNWidget /> },
  wol: { label: 'Wake-on-LAN', icon: <FaBolt />, render: () => <WOLWidget /> },
  sftp: { label: 'SFTP Manager', icon: <FaFolder />, render: () => <SFTPManager /> },
  clock: { label: 'Clock', icon: <FaRegClock />, render: () => <ClockWidget /> },
  network: { label: 'Network', icon: <FaNetworkWired />, render: () => <NetworkWidget /> },
  adblock: { label: 'Ad Block', icon: <FaShieldHalved />, render: () => <AdblockWidget /> },
};

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/Lani0516', icon: <FaGithub /> },
  { label: 'Email', href: 'mailto:landedwriter0103@gmail.com', icon: <FaEnvelope /> },
  { label: 'Facebook', href: 'https://www.fb.com/liu.wen.en.235257', icon: <FaFacebook /> },
  { label: 'Instagram', href: '#', icon: <FaInstagram /> },
];

const defaultWidgets = Object.keys(widgetMap);

const sizeDefaults: Record<string, Record<string, { w: number; h: number }>> = Object.fromEntries(
  Object.entries(defaultLayouts).map(([bp, items]) => [
    bp,
    Object.fromEntries(items.map((l) => [l.i, { w: l.w, h: l.h }])),
  ])
);

export function App() {
  const [palette, setPalette] = useLocalStorage<ThemePalette>('dashboard-palette', 'default');
  const [mode, setMode] = useLocalStorage<ThemeMode>('dashboard-mode', 'dark');
  const [fontPrefs, setFontPrefs] = useLocalStorage<FontPrefs>('dashboard-fonts', DEFAULT_FONT_PREFS);
  const [layouts, setLayouts] = useState(defaultLayouts);
  const [activeWidgets, setActiveWidgets] = useState<string[]>(defaultWidgets);
  const [editMode, setEditMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useLocalStorage('dashboard-sidebar-open', true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [localSites, setLocalSites] = useState<LocalSite[]>([]);
  const [authState, setAuthState] = useState<'checking' | 'locked' | 'ready'>('checking');
  useWebSocket();

  useEffect(() => {
    api.auth
      .status()
      .then(async ({ authEnabled }) => {
        if (!authEnabled) return setAuthState('ready');
        if (!getToken()) return setAuthState('locked');
        try {
          await api.files.root();
          setAuthState('ready');
        } catch {
          setAuthState('locked');
        }
      })
      .catch(() => setAuthState('ready'));
  }, []);

  useEffect(() => {
    applyFontPrefs(fontPrefs);
  }, [fontPrefs]);

  useEffect(() => {
    if (authState !== 'ready') return;
    let cancelled = false;
    const loadSites = () => {
      api.sites
        .list()
        .then((sites) => {
          if (!cancelled) setLocalSites(sites);
        })
        .catch(() => {
          if (!cancelled) setLocalSites([]);
        });
    };
    loadSites();
    const timer = window.setInterval(loadSites, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [authState]);

  useEffect(() => {
    applyTheme(palette, mode);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(palette, mode);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [palette, mode]);

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

  const pageTitle =
    view === 'dashboard'
    ? 'Dashboard'
    : view === 'workspace'
    ? 'Workspace'
    : 'Local Sites';

  const sidebarSections = [
    {
      title: '',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: <FaGaugeHigh /> },
        { key: 'workspace', label: 'Workspace', icon: <FaCode /> },
        {
          key: 'sites',
          label: 'Local Sites',
          icon: <FaGlobe />,
          children: localSites.map((site) => ({
            key: `site-${site.port}`,
            label: String(site.port),
            meta: site.title || site.process || 'HTTP 200',
            href: `http://${window.location.hostname}:${site.port}`,
          })),
        },
      ],
    },
  ];

  if (authState === 'checking') {
    return <div className="h-screen bg-bg" />;
  }
  if (authState === 'locked') {
    return <Login onAuthed={() => setAuthState('ready')} />;
  }

  return (
    <div className={`bg-bg flex ${view === 'workspace' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <Sidebar
        sections={sidebarSections}
        activeKey={view}
        onSelect={(key) => setView(key as View)}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onSettings={() => setSettingsOpen(true)}
      />
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-0 transition-[margin] duration-200 ease-out ${
          sidebarOpen ? 'ml-60' : 'ml-16'
        }`}
      >
      <header className="border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-text">{pageTitle}</h1>
        <div className="flex items-center gap-3">
          {view === 'dashboard' && (
            <>
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
            </>
          )}
          <ThemeSwitcher
            palette={palette}
            mode={mode}
            onPaletteChange={setPalette}
            onModeChange={setMode}
          />
        </div>
      </header>

      {view === 'dashboard' && editMode && (
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

      {view === 'workspace' ? (
        <main className="flex-1 min-h-0">
          <Workspace />
        </main>
      ) : view === 'sites' ? (
        <main className="flex-1">
          <Sites />
        </main>
      ) : (
        <main className="p-4 flex-1">
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
              <div key={key} id={`widget-${key}`}>
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
      )}

      <footer className="shrink-0 border-t border-border px-6 py-5 flex flex-col sm:grid sm:grid-cols-3 items-center gap-4">
        <div className="flex items-center gap-3 sm:justify-self-start">
          <img src="/logo.png" alt="" className="logo-img w-7 h-7" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text">Lani Dashboard</span>
            <span className="text-xs text-text-muted">Self-hosted homelab control panel</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:justify-self-center">
          {socialLinks.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              title={s.label}
              aria-label={s.label}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-primary hover:border-primary transition-colors"
            >
              {s.icon}
            </a>
          ))}
        </div>

        <span className="text-xs text-text-muted sm:justify-self-end">
          © {new Date().getFullYear()} Lani. All rights reserved.
        </span>
      </footer>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        palette={palette}
        mode={mode}
        onPaletteChange={setPalette}
        onModeChange={setMode}
        fontPrefs={fontPrefs}
        onFontPrefsChange={setFontPrefs}
        onResetLayout={resetLayout}
        widgets={Object.entries(widgetMap).map(([key, m]) => ({ key, label: m.label, icon: m.icon }))}
        activeWidgets={activeWidgets}
        onToggleWidget={(key, enabled) => (enabled ? addWidget(key) : removeWidget(key))}
      />
    </div>
  );
}
