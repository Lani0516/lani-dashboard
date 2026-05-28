import type { ThemeConfig, ThemeId } from '@shared/types/index.js';

export const themes: Record<ThemeId, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
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
  },
  light: {
    id: 'light',
    name: 'Light',
    colors: {
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
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    colors: {
      bg: '#020617',
      bgCard: '#0f172a',
      bgHover: '#1e293b',
      text: '#e2e8f0',
      textMuted: '#64748b',
      primary: '#38bdf8',
      secondary: '#818cf8',
      accent: '#c084fc',
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      border: '#1e293b',
    },
  },
  nord: {
    id: 'nord',
    name: 'Nord',
    colors: {
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
  },
  catppuccin: {
    id: 'catppuccin',
    name: 'Catppuccin',
    colors: {
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
  },
};

export function applyTheme(themeId: ThemeId) {
  const theme = themes[themeId];
  if (!theme) return;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  }
}
