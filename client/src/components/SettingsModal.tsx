import { useState } from 'react';
import { FaGear, FaSun, FaMoon, FaDesktop, FaArrowsRotate, FaPalette, FaTableCells, FaSliders, FaFont } from 'react-icons/fa6';
import { Modal } from './Modal';
import { palettes, paletteList, resolveMode } from '../themes/themes';
import { FONT_OPTIONS, fontStack, MIN_FONT_SIZE, MAX_FONT_SIZE, type FontPrefs } from '../fonts';
import type { ThemePalette, ThemeMode } from '@shared/types/index.js';

export interface WidgetToggle {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  palette: ThemePalette;
  mode: ThemeMode;
  onPaletteChange: (p: ThemePalette) => void;
  onModeChange: (m: ThemeMode) => void;
  fontPrefs: FontPrefs;
  onFontPrefsChange: (p: FontPrefs) => void;
  onResetLayout: () => void;
  widgets: WidgetToggle[];
  activeWidgets: string[];
  onToggleWidget: (key: string, enabled: boolean) => void;
}

const modeOptions: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <FaSun size={13} /> },
  { id: 'dark', label: 'Dark', icon: <FaMoon size={13} /> },
  { id: 'system', label: 'System', icon: <FaDesktop size={13} /> },
];

type TabId = 'appearance' | 'editor' | 'widgets' | 'layout';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <FaPalette size={13} /> },
  { id: 'editor', label: 'Editor', icon: <FaFont size={13} /> },
  { id: 'widgets', label: 'Widgets', icon: <FaTableCells size={13} /> },
  { id: 'layout', label: 'Layout', icon: <FaSliders size={13} /> },
];

function FontPicker({
  label,
  font,
  size,
  onFont,
  onSize,
}: {
  label: string;
  font: string;
  size: number;
  onFont: (id: string) => void;
  onSize: (n: number) => void;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text">{label}</span>
        <span className="text-xs text-text-muted tabular-nums">{size}px</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {FONT_OPTIONS.map((f) => {
          const active = f.id === font;
          return (
            <button
              key={f.id}
              onClick={() => onFont(f.id)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-bg-hover'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${active ? 'text-primary' : 'text-text'}`}>{f.label}</div>
              <div className="text-sm text-text-secondary truncate" style={{ fontFamily: fontStack(f.id) }}>
                AaBb 123 =&gt;
              </div>
            </button>
          );
        })}
      </div>
      <input
        type="range"
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        value={size}
        onChange={(e) => onSize(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function Field({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {desc && <p className="text-xs text-text-muted mt-0.5 mb-3">{desc}</p>}
      {!desc && <div className="mb-3" />}
      {children}
    </section>
  );
}

export function SettingsModal({
  open,
  onClose,
  palette,
  mode,
  onPaletteChange,
  onModeChange,
  fontPrefs,
  onFontPrefsChange,
  onResetLayout,
  widgets,
  activeWidgets,
  onToggleWidget,
}: SettingsModalProps) {
  const [tab, setTab] = useState<TabId>('appearance');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      icon={<FaGear size={15} />}
      size="xl"
      bodyClassName="flex-1 flex min-h-0"
    >
      <nav className="w-44 shrink-0 border-r border-border p-2 overflow-y-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:text-text hover:bg-bg-hover'
            }`}
          >
            <span className="flex items-center">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-5 min-w-0">
        {tab === 'appearance' && (
          <>
            <Field title="Mode" desc="Choose light, dark, or follow your system.">
              <div className="grid grid-cols-3 gap-2">
                {modeOptions.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onModeChange(m.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-md border text-xs font-medium transition-colors ${
                      mode === m.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-text-secondary hover:text-text hover:bg-bg-hover'
                    }`}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field title="Theme" desc="Color palette applied across the dashboard.">
              <div className="grid grid-cols-3 gap-2">
                {paletteList.map((p) => {
                  const preview = palettes[p.id][resolveMode(mode)];
                  const active = palette === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onPaletteChange(p.id)}
                      className={`rounded-md border p-2 text-left transition-colors ${
                        active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-bg-hover'
                      }`}
                    >
                      <div
                        className="h-12 rounded-md mb-2 flex items-end gap-1 p-1.5 overflow-hidden"
                        style={{ backgroundColor: preview.bg }}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preview.primary }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preview.secondary }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preview.accent }} />
                      </div>
                      <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-text'}`}>
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        {tab === 'editor' && (
          <Field title="Fonts" desc="Monospace font and size for the code editor and terminal.">
            <FontPicker
              label="Editor"
              font={fontPrefs.editorFont}
              size={fontPrefs.editorFontSize}
              onFont={(id) => onFontPrefsChange({ ...fontPrefs, editorFont: id })}
              onSize={(n) => onFontPrefsChange({ ...fontPrefs, editorFontSize: n })}
            />
            <FontPicker
              label="Terminal"
              font={fontPrefs.terminalFont}
              size={fontPrefs.terminalFontSize}
              onFont={(id) => onFontPrefsChange({ ...fontPrefs, terminalFont: id })}
              onSize={(n) => onFontPrefsChange({ ...fontPrefs, terminalFontSize: n })}
            />
          </Field>
        )}

        {tab === 'widgets' && (
          <Field title="Widgets" desc="Show or hide dashboard panels.">
            <div className="flex flex-col gap-1.5">
              {widgets.map((w) => {
                const enabled = activeWidgets.includes(w.key);
                return (
                  <button
                    key={w.key}
                    onClick={() => onToggleWidget(w.key, !enabled)}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border text-left hover:bg-bg-hover transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-text">
                      <span className="flex items-center text-text-secondary">{w.icon}</span>
                      {w.label}
                    </span>
                    <span
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                        enabled ? 'bg-primary' : 'bg-bg-hover border border-border'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {tab === 'layout' && (
          <Field title="Layout" desc="Reset widget positions and visibility to defaults.">
            <button
              onClick={() => {
                onResetLayout();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium border border-border text-text-secondary hover:text-text hover:border-error hover:bg-error/10 transition-colors"
            >
              <FaArrowsRotate size={12} />
              Reset dashboard layout
            </button>
          </Field>
        )}
      </div>
    </Modal>
  );
}
