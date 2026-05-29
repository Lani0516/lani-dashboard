import { useState, useRef, useEffect } from 'react';
import { FaPalette, FaSun, FaMoon, FaDesktop } from 'react-icons/fa6';
import { palettes, paletteList, resolveMode } from '../themes/themes';
import type { ThemePalette, ThemeMode } from '@shared/types/index.js';

interface ThemeSwitcherProps {
  palette: ThemePalette;
  mode: ThemeMode;
  onPaletteChange: (p: ThemePalette) => void;
  onModeChange: (m: ThemeMode) => void;
}

const modeOptions: { id: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { id: 'light', icon: <FaSun size={12} />, label: 'Light' },
  { id: 'dark', icon: <FaMoon size={12} />, label: 'Dark' },
  { id: 'system', icon: <FaDesktop size={12} />, label: 'System' },
];

export function ThemeSwitcher({ palette, mode, onPaletteChange, onModeChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border text-text-secondary hover:text-text hover:border-primary transition-colors"
        title="Change theme"
      >
        <FaPalette size={13} />
        Theme
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-20 bg-bg-card border border-border rounded-lg shadow-lg p-2 w-44">
          <div className="grid grid-cols-3 gap-1 mb-2">
            {modeOptions.map((m) => (
              <button
                key={m.id}
                onClick={() => onModeChange(m.id)}
                title={m.label}
                className={`flex items-center justify-center py-1.5 rounded-md transition-colors ${
                  mode === m.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text'
                }`}
              >
                {m.icon}
              </button>
            ))}
          </div>
          <div className="space-y-0.5">
            {paletteList.map((p) => {
              const preview = palettes[p.id][resolveMode(mode)];
              return (
                <button
                  key={p.id}
                  onClick={() => onPaletteChange(p.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
                    palette === p.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-border shrink-0"
                    style={{ backgroundColor: preview.bg }}
                  />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
