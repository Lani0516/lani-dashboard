import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';
import type { ITheme } from '@xterm/xterm';

export const MONO_FONT =
  "'JetBrains Mono', 'Hack Nerd Font', ui-monospace, SFMono-Regular, Menlo, monospace";

function v(name: string, fallback: string) {
  const x = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return x || fallback;
}

export const editorFont = () => v('--font-editor', MONO_FONT);
export const editorFontSize = () => parseInt(v('--font-editor-size', '13px'), 10) || 13;
export const terminalFont = () => v('--font-terminal', MONO_FONT);
export const terminalFontSize = () => parseInt(v('--font-terminal-size', '13px'), 10) || 13;

export function isDark() {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

// xterm theme derived from dashboard CSS vars.
export function xtermTheme(): ITheme {
  const bg = v('--color-bg', '#0d1117');
  const fg = v('--color-text', '#e6edf3');
  const primary = v('--color-primary', '#58a6ff');
  const secondary = v('--color-secondary', '#6366f1');
  const accent = v('--color-accent', '#8b5cf6');
  const success = v('--color-success', '#22c55e');
  const warning = v('--color-warning', '#eab308');
  const error = v('--color-error', '#ef4444');
  const muted = v('--color-text-muted', '#71717a');
  const border = v('--color-border', '#27272a');
  return {
    background: bg,
    foreground: fg,
    cursor: primary,
    cursorAccent: bg,
    selectionBackground: v('--color-bg-hover', '#252525'),
    black: border,
    red: error,
    green: success,
    yellow: warning,
    blue: primary,
    magenta: accent,
    cyan: secondary,
    white: fg,
    brightBlack: muted,
    brightRed: error,
    brightGreen: success,
    brightYellow: warning,
    brightBlue: primary,
    brightMagenta: accent,
    brightCyan: secondary,
    brightWhite: fg,
  };
}

// CodeMirror chrome + syntax theme derived from dashboard CSS vars.
export function cmTheme(): Extension {
  const bg = v('--color-bg', '#0d1117');
  const card = v('--color-bg-card', '#1a1a1a');
  const fg = v('--color-text', '#e4e4e7');
  const muted = v('--color-text-muted', '#71717a');
  const primary = v('--color-primary', '#3b82f6');
  const secondary = v('--color-secondary', '#6366f1');
  const accent = v('--color-accent', '#8b5cf6');
  const success = v('--color-success', '#22c55e');
  const warning = v('--color-warning', '#eab308');
  const error = v('--color-error', '#ef4444');
  const border = v('--color-border', '#27272a');
  const hover = v('--color-bg-hover', '#252525');

  const chrome = EditorView.theme(
    {
      '&': { height: '100%', backgroundColor: bg, color: fg, fontSize: `${editorFontSize()}px` },
      '.cm-scroller': { overflow: 'auto', fontFamily: editorFont() },
      '.cm-content': { caretColor: primary },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: primary },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        { backgroundColor: hover },
      '.cm-gutters': { backgroundColor: bg, color: muted, border: 'none' },
      '.cm-activeLineGutter': { backgroundColor: card, color: fg },
      '.cm-activeLine': { backgroundColor: `${hover}66` },
      '.cm-lineNumbers .cm-gutterElement': { color: muted },
      '.cm-foldPlaceholder': { backgroundColor: card, border: 'none', color: muted },
      '.cm-tooltip': { backgroundColor: card, border: `1px solid ${border}`, color: fg },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        backgroundColor: hover,
        color: fg,
      },
      '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
        backgroundColor: hover,
        outline: `1px solid ${primary}`,
      },
    },
    { dark: isDark() }
  );

  const highlight = HighlightStyle.define([
    { tag: [t.keyword, t.moduleKeyword, t.operatorKeyword], color: accent },
    { tag: [t.controlKeyword, t.definitionKeyword], color: accent },
    { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: fg },
    { tag: [t.variableName], color: fg },
    { tag: [t.function(t.variableName), t.labelName], color: primary },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: warning },
    { tag: [t.definition(t.name), t.separator], color: fg },
    { tag: [t.typeName, t.className, t.namespace], color: secondary },
    { tag: [t.number, t.changed, t.annotation, t.self], color: warning },
    { tag: [t.operator], color: secondary },
    { tag: [t.string, t.inserted], color: success },
    { tag: [t.regexp, t.special(t.string)], color: success },
    { tag: [t.comment, t.lineComment, t.blockComment], color: muted, fontStyle: 'italic' },
    { tag: [t.meta, t.documentMeta], color: muted },
    { tag: t.invalid, color: error },
    { tag: t.link, color: primary, textDecoration: 'underline' },
    { tag: t.heading, color: primary, fontWeight: 'bold' },
    { tag: [t.atom, t.bool], color: warning },
    { tag: t.tagName, color: error },
    { tag: t.attributeName, color: warning },
  ]);

  return [chrome, syntaxHighlighting(highlight)];
}

// Run cb whenever dashboard palette/mode changes (data-theme / data-palette attrs).
export function onThemeChange(cb: () => void): () => void {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-palette', 'style'],
  });
  return () => obs.disconnect();
}
