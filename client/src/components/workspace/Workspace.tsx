import { useEffect, useRef, useState } from 'react';
import { FaFloppyDisk, FaTerminal, FaCircle } from 'react-icons/fa6';
import type { FileEntry } from '@shared/types/index.js';
import { api } from '../../services/api';
import { FileTree } from './FileTree';
import { Editor } from './Editor';
import { Terminal } from './Terminal';

interface OpenFile {
  path: string;
  name: string;
  content: string;
}

export function Workspace() {
  const [root, setRoot] = useState<string>();
  const [rootError, setRootError] = useState<string>();
  const [file, setFile] = useState<OpenFile | null>(null);
  const [doc, setDoc] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [termCwd, setTermCwd] = useState<string>();

  const [treeWidth, setTreeWidth] = useState(260);
  const [termHeight, setTermHeight] = useState(240);
  const drag = useRef<{ kind: 'tree' | 'term'; start: number; base: number } | null>(null);

  useEffect(() => {
    api.files
      .root()
      .then((r) => setRoot(r.root))
      .catch((e) => setRootError(String(e instanceof Error ? e.message : e)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === 'tree') {
        setTreeWidth(Math.min(600, Math.max(160, d.base + (e.clientX - d.start))));
      } else {
        setTermHeight(Math.min(700, Math.max(80, d.base - (e.clientY - d.start))));
      }
    };
    const onUp = () => {
      drag.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = (kind: 'tree' | 'term', e: React.MouseEvent) => {
    drag.current = { kind, start: kind === 'tree' ? e.clientX : e.clientY, base: kind === 'tree' ? treeWidth : termHeight };
    document.body.style.cursor = kind === 'tree' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const openFile = async (entry: FileEntry) => {
    try {
      const { content } = await api.files.read(entry.path);
      setFile({ path: entry.path, name: entry.name, content });
      setDoc(content);
      setDirty(false);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    try {
      await api.files.write(file.path, doc);
      setFile({ ...file, content: doc });
      setDirty(false);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  };

  if (rootError) {
    return <div className="p-6 text-error">Failed to load files: {rootError}</div>;
  }
  if (!root) {
    return <div className="p-6 text-text-muted">Loading…</div>;
  }

  return (
    <div className="flex h-full min-h-0">
      <div style={{ width: treeWidth }} className="shrink-0 h-full min-h-0">
        <FileTree rootPath={termCwd || root} activeFilePath={file?.path} onOpenFile={openFile} />
      </div>
      <div onMouseDown={(e) => startDrag('tree', e)} className="w-1 cursor-col-resize bg-border hover:bg-primary shrink-0" />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* editor pane */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-10 px-3 flex items-center gap-2 border-b border-border bg-bg-card shrink-0">
            {file ? (
              <>
                <span className="text-sm text-text flex items-center gap-2 min-w-0">
                  <span className="truncate">{file.name}</span>
                  {dirty && <FaCircle size={7} className="text-primary shrink-0" />}
                </span>
                <span className="flex-1" />
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-border text-text-secondary hover:text-text hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Save (Cmd/Ctrl-S)"
                >
                  <FaFloppyDisk size={12} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <span className="text-sm text-text-muted">Select a file to edit</span>
            )}
            <button
              onClick={() => setShowTerminal((v) => !v)}
              title="Toggle terminal"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                showTerminal ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:text-text hover:border-primary'
              } ${file ? '' : 'ml-auto'}`}
            >
              <FaTerminal size={12} />
            </button>
          </div>
          <div className="flex-1 min-h-0 bg-bg overflow-hidden">
            {file ? (
              <Editor
                path={file.path}
                initialDoc={file.content}
                onChange={(d) => {
                  setDoc(d);
                  setDirty(d !== file.content);
                }}
                onSave={save}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-sm">
                No file open
              </div>
            )}
          </div>
        </div>

        {/* terminal pane */}
        {showTerminal && (
          <>
            <div onMouseDown={(e) => startDrag('term', e)} className="h-1 cursor-row-resize bg-border hover:bg-primary shrink-0" />
            <div style={{ height: termHeight }} className="shrink-0 bg-bg border-t border-border flex flex-col min-h-0">
              <div className="h-7 px-3 flex items-center gap-2 text-xs text-text-muted border-b border-border shrink-0">
                <FaTerminal size={11} />
                Terminal
              </div>
              <div className="flex-1 min-h-0 p-1">
                <Terminal onCwd={setTermCwd} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
