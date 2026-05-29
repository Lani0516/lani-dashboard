import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, type Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { cmTheme, onThemeChange } from './theme';

function langFor(name: string): Extension[] {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return [javascript()];
    case 'ts':
    case 'tsx':
      return [javascript({ typescript: true, jsx: ext === 'tsx' })];
    case 'json':
      return [json()];
    case 'py':
      return [python()];
    case 'html':
    case 'htm':
      return [html()];
    case 'css':
      return [css()];
    default:
      return [];
  }
}

interface EditorProps {
  path: string;
  initialDoc: string;
  onChange: (doc: string) => void;
  onSave: () => void;
}

export function Editor({ path, initialDoc, onChange, onSave }: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const themeComp = new Compartment();

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          basicSetup,
          themeComp.of(cmTheme()),
          ...langFor(path),
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                onSaveRef.current();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
        ],
      }),
    });

    const offTheme = onThemeChange(() => {
      view.dispatch({ effects: themeComp.reconfigure(cmTheme()) });
    });

    return () => {
      offTheme();
      view.destroy();
    };
    // recreate editor whenever the opened file changes
  }, [path]);

  return <div ref={hostRef} className="w-full h-full overflow-hidden" />;
}
