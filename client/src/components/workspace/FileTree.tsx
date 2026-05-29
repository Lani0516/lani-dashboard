import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaFolder,
  FaFolderOpen,
  FaFile,
  FaChevronRight,
  FaChevronDown,
  FaArrowsRotate,
  FaFolderPlus,
  FaUpload,
  FaDownload,
  FaTrash,
  FaPen,
} from 'react-icons/fa6';
import type { FileEntry } from '@shared/types/index.js';
import { api } from '../../services/api';

interface FileTreeProps {
  rootPath: string;
  activeFilePath?: string;
  onOpenFile: (entry: FileEntry) => void;
}

export function FileTree({ rootPath, activeFilePath, onOpenFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootPath]));
  const [children, setChildren] = useState<Record<string, FileEntry[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [selectedDir, setSelectedDir] = useState(rootPath);
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (dir: string) => {
    setLoading((s) => new Set(s).add(dir));
    try {
      const entries = await api.files.list(dir);
      setChildren((c) => ({ ...c, [dir]: entries }));
      setError(undefined);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading((s) => {
        const n = new Set(s);
        n.delete(dir);
        return n;
      });
    }
  }, []);

  useEffect(() => {
    setExpanded(new Set([rootPath]));
    setSelectedDir(rootPath);
    setChildren({});
    load(rootPath);
  }, [rootPath, load]);

  const toggle = (dir: string) => {
    setSelectedDir(dir);
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(dir)) {
        n.delete(dir);
      } else {
        n.add(dir);
        if (!children[dir]) load(dir);
      }
      return n;
    });
  };

  const refreshDir = (dir: string) => load(dir);

  const handleNewFolder = async () => {
    const name = prompt('New folder name:');
    if (!name) return;
    try {
      await api.files.mkdir(`${selectedDir}/${name}`);
      await load(selectedDir);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      for (const f of Array.from(files)) await api.files.upload(selectedDir, f);
      await load(selectedDir);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const handleDelete = async (entry: FileEntry, parentDir: string) => {
    if (!confirm(`Delete "${entry.name}"? This cannot be undone.`)) return;
    try {
      await api.files.delete(entry.path);
      await load(parentDir);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const handleRename = async (entry: FileEntry, parentDir: string) => {
    const next = prompt('Rename to:', entry.name);
    if (!next || next === entry.name) return;
    try {
      await api.files.rename(entry.path, `${parentDir}/${next}`);
      await load(parentDir);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const renderRow = (entry: FileEntry, parentDir: string, depth: number) => {
    const isDir = entry.type === 'directory';
    const isOpen = expanded.has(entry.path);
    const isActive = entry.path === activeFilePath || entry.path === selectedDir;
    return (
      <div key={entry.path}>
        <div
          className={`group flex items-center gap-1 pr-1 h-7 rounded cursor-pointer text-sm whitespace-nowrap ${
            isActive ? 'bg-bg-hover text-text' : 'text-text-secondary hover:bg-bg-hover/60'
          }`}
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={() => (isDir ? toggle(entry.path) : (setSelectedDir(parentDir), onOpenFile(entry)))}
        >
          <span className="w-3 flex items-center justify-center shrink-0 text-text-muted">
            {isDir && (isOpen ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />)}
          </span>
          <span className="w-4 flex items-center justify-center shrink-0 text-text-muted">
            {isDir ? isOpen ? <FaFolderOpen size={13} /> : <FaFolder size={13} /> : <FaFile size={12} />}
          </span>
          <span className="flex-1 overflow-hidden text-ellipsis">{entry.name}</span>
          <span className="hidden group-hover:flex items-center gap-1.5 text-text-muted shrink-0">
            {!isDir && (
              <button
                title="Download"
                onClick={(e) => (e.stopPropagation(), api.files.download(entry.path, entry.name))}
                className="hover:text-primary"
              >
                <FaDownload size={11} />
              </button>
            )}
            <button
              title="Rename"
              onClick={(e) => (e.stopPropagation(), handleRename(entry, parentDir))}
              className="hover:text-primary"
            >
              <FaPen size={11} />
            </button>
            <button
              title="Delete"
              onClick={(e) => (e.stopPropagation(), handleDelete(entry, parentDir))}
              className="hover:text-error"
            >
              <FaTrash size={11} />
            </button>
          </span>
        </div>
        {isDir && isOpen && (
          <div>
            {loading.has(entry.path) && !children[entry.path] ? (
              <div className="text-xs text-text-muted py-1" style={{ paddingLeft: (depth + 1) * 12 + 8 }}>
                loading…
              </div>
            ) : (
              (children[entry.path] || []).map((c) => renderRow(c, entry.path, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-bg border-r border-border min-w-0">
      <div className="h-10 px-2 flex items-center gap-1 border-b border-border shrink-0">
        <span
          title={rootPath}
          className="text-xs font-semibold uppercase tracking-wider text-text-muted flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {rootPath.replace(/\/+$/, '').split('/').pop() || rootPath}
        </span>
        <button title="New folder" onClick={handleNewFolder} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
          <FaFolderPlus size={13} />
        </button>
        <button title="Upload to selected folder" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
          <FaUpload size={13} />
        </button>
        <button title="Refresh" onClick={() => refreshDir(selectedDir)} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
          <FaArrowsRotate size={13} />
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </div>
      {error && <div className="px-3 py-1.5 text-xs text-error break-words">{error}</div>}
      <div className="flex-1 overflow-auto py-1 px-1">
        {(children[rootPath] || []).map((c) => renderRow(c, rootPath, 0))}
      </div>
    </div>
  );
}
