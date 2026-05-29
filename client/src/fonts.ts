// Monospace fonts selectable for the editor and terminal.
// Each stack ends with 'Hack Nerd Font' so glyph icons (Nerd Font PUA) render
// even when the primary face lacks them.

const NERD = "'Hack Nerd Font', ui-monospace, SFMono-Regular, Menlo, monospace";

export interface FontOption {
  id: string;
  label: string;
  stack: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: 'jetbrains', label: 'JetBrains Mono', stack: `'JetBrains Mono', ${NERD}` },
  { id: 'fira', label: 'Fira Code', stack: `'Fira Code', ${NERD}` },
  { id: 'cascadia', label: 'Cascadia Code', stack: `'Cascadia Code', ${NERD}` },
  { id: 'source', label: 'Source Code Pro', stack: `'Source Code Pro', ${NERD}` },
  { id: 'ibm', label: 'IBM Plex Mono', stack: `'IBM Plex Mono', ${NERD}` },
  { id: 'roboto', label: 'Roboto Mono', stack: `'Roboto Mono', ${NERD}` },
  { id: 'hack', label: 'Hack Nerd Font', stack: NERD },
  { id: 'menlo', label: 'Menlo', stack: `Menlo, ${NERD}` },
];

export const DEFAULT_EDITOR_FONT = 'jetbrains';
export const DEFAULT_TERMINAL_FONT = 'jetbrains';
export const DEFAULT_FONT_SIZE = 13;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;

export function fontStack(id: string): string {
  return (FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0]).stack;
}

export interface FontPrefs {
  editorFont: string;
  terminalFont: string;
  editorFontSize: number;
  terminalFontSize: number;
}

export const DEFAULT_FONT_PREFS: FontPrefs = {
  editorFont: DEFAULT_EDITOR_FONT,
  terminalFont: DEFAULT_TERMINAL_FONT,
  editorFontSize: DEFAULT_FONT_SIZE,
  terminalFontSize: DEFAULT_FONT_SIZE,
};

// Push prefs to CSS vars on :root. Editor + Terminal read these; the terminal's
// MutationObserver on the `style` attr re-applies the font live on change.
export function applyFontPrefs(p: FontPrefs): void {
  const r = document.documentElement.style;
  r.setProperty('--font-editor', fontStack(p.editorFont));
  r.setProperty('--font-editor-size', `${p.editorFontSize}px`);
  r.setProperty('--font-terminal', fontStack(p.terminalFont));
  r.setProperty('--font-terminal-size', `${p.terminalFontSize}px`);
}
