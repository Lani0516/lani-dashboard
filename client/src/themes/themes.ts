import type { PaletteConfig, ThemeColors, ThemePalette, ThemeMode } from '@shared/types/index.js';

export const palettes: Record<ThemePalette, PaletteConfig> = {
  default: {
    name: 'Default',
    dark: {
      bg: '#0f0f0f',
      bgCard: '#1a1a1a',
      bgHover: '#252525',
      text: '#e4e4e7',
      textMuted: '#71717a',
      primary: '#3b82f6',
      secondary: '#6366f1',
      accent: '#8b5cf6',
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      border: '#27272a',
    },
    light: {
      bg: '#f8fafc',
      bgCard: '#ffffff',
      bgHover: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#64748b',
      primary: '#2563eb',
      secondary: '#4f46e5',
      accent: '#7c3aed',
      success: '#16a34a',
      warning: '#ca8a04',
      error: '#dc2626',
      border: '#e2e8f0',
    },
  },
  nord: {
    name: 'Nord',
    dark: {
      bg: '#2e3440',
      bgCard: '#3b4252',
      bgHover: '#434c5e',
      text: '#eceff4',
      textMuted: '#d8dee9',
      primary: '#88c0d0',
      secondary: '#81a1c1',
      accent: '#b48ead',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      border: '#4c566a',
    },
    light: {
      bg: '#eceff4',
      bgCard: '#e5e9f0',
      bgHover: '#dce1ea',
      text: '#2e3440',
      textMuted: '#4c566a',
      primary: '#4c688f',
      secondary: '#5e7f9e',
      accent: '#8a5e82',
      success: '#5e7d3f',
      warning: '#a37a1e',
      error: '#a3434c',
      border: '#c8d0dd',
    },
  },
  catppuccin: {
    name: 'Catppuccin',
    dark: {
      bg: '#1e1e2e',
      bgCard: '#313244',
      bgHover: '#45475a',
      text: '#cdd6f4',
      textMuted: '#a6adc8',
      primary: '#89b4fa',
      secondary: '#cba6f7',
      accent: '#f5c2e7',
      success: '#a6e3a1',
      warning: '#f9e2af',
      error: '#f38ba8',
      border: '#45475a',
    },
    light: {
      bg: '#eff1f5',
      bgCard: '#e6e9ef',
      bgHover: '#dce0e8',
      text: '#4c4f69',
      textMuted: '#6c6f85',
      primary: '#1e66f5',
      secondary: '#8839ef',
      accent: '#ea76cb',
      success: '#40a02b',
      warning: '#df8e1d',
      error: '#d20f39',
      border: '#ccd0da',
    },
  },
};

export const paletteList = Object.entries(palettes).map(([id, cfg]) => ({
  id: id as ThemePalette,
  name: cfg.name,
}));

export function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function applyTheme(palette: ThemePalette, mode: ThemeMode) {
  const cfg = palettes[palette] ?? palettes.default;
  const resolved = resolveMode(mode);
  const colors: ThemeColors = cfg[resolved];

  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-palette', palette);
  for (const [key, value] of Object.entries(colors)) {
    const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  }
}
