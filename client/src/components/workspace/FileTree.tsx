import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaArrowsRotate,
  FaBoxArchive,
  FaCheck,
  FaChevronDown,
  FaChevronRight,
  FaClipboard,
  FaCopy,
  FaDownload,
  FaFile,
  FaFolder,
  FaFolderOpen,
  FaFolderPlus,
  FaPaste,
  FaPen,
  FaScissors,
  FaTrash,
  FaUpload,
} from 'react-icons/fa6';
import type { ArchiveFormat, FileEntry } from '@shared/types/index.js';
import { api } from '../../services/api';

interface FileTreeProps {
  rootPath: string;
  activeFilePath?: string;
  onOpenFile: (entry: FileEntry) => void;
}

type ClipboardState = { mode: 'copy' | 'cut'; paths: string[] } | null;

interface ContextMenuState {
  x: number;
  y: number;
  entry: FileEntry;
  parentDir: string;
}

const archiveFormats: ArchiveFormat[] = ['zip', 'tar.gz', '7z'];

function parentPath(path: string) {
  const clean = path.replace(/\/+$/, '');
  const i = clean.lastIndexOf('/');
  return i <= 0 ? '/' : clean.slice(0, i);
}

function archiveBaseName(entry?: FileEntry) {
  if (!entry) return 'archive';
  return entry.name.replace(/(\.tar\.gz|\.tgz|\.zip|\.7z)$/i, '') || 'archive';
}

function archiveExtension(format: ArchiveFormat) {
  return format;
}

function isArchive(entry: FileEntry) {
  return /\.(zip|7z|tar\.gz|tgz)$/i.test(entry.name);
}

export function FileTree({ rootPath, activeFilePath, onOpenFile }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([rootPath]));
  const [children, setChildren] = useState<Record<string, FileEntry[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [selectedDir, setSelectedDir] = useState(rootPath);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [multiMode, setMultiMode] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>();
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
    setSelectedPaths(new Set());
    setChildren({});
    load(rootPath);
  }, [rootPath, load]);

  useEffect(() => {
    const close = () => setContextMenu(undefined);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(undefined);
        setSelectedPaths(new Set());
      }
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

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

  const refreshDirs = async (dirs: string[]) => {
    const uniq = [...new Set(dirs)];
    await Promise.all(uniq.map((dir) => load(dir)));
  };

  const refreshSelectionParents = async (paths: string[], extra: string[] = []) => {
    await refreshDirs([...paths.map(parentPath), selectedDir, ...extra]);
  };

  const selectionFor = (entry?: FileEntry) => {
    if (entry && selectedPaths.has(entry.path)) return [...selectedPaths];
    if (entry) return [entry.path];
    return [...selectedPaths];
  };

  const selectedEntries = () => {
    const byPath = new Map<string, FileEntry>();
    for (const entries of Object.values(children)) {
      for (const entry of entries) byPath.set(entry.path, entry);
    }
    return [...selectedPaths].map((path) => byPath.get(path)).filter(Boolean) as FileEntry[];
  };

  const toggleSelected = (path: string) => {
    setSelectedPaths((s) => {
      const n = new Set(s);
      if (n.has(path)) n.delete(path);
      else n.add(path);
      return n;
    });
  };

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

  const deletePaths = async (paths: string[]) => {
    if (!paths.length) return;
    if (!confirm(`Delete ${paths.length} item${paths.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      await api.files.deleteBatch(paths);
      setSelectedPaths(new Set());
      await refreshSelectionParents(paths);
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

  const copyToClipboard = (paths: string[], mode: 'copy' | 'cut') => {
    if (!paths.length) return;
    setClipboard({ mode, paths });
  };

  const pasteInto = async (destDir: string) => {
    if (!clipboard?.paths.length) return;
    try {
      if (clipboard.mode === 'copy') await api.files.copy(clipboard.paths, destDir);
      else {
        await api.files.move(clipboard.paths, destDir);
        setClipboard(null);
        setSelectedPaths(new Set());
      }
      await refreshSelectionParents(clipboard.paths, [destDir]);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const moveTo = async (paths: string[]) => {
    if (!paths.length) return;
    const destDir = prompt('Move to folder:', selectedDir);
    if (!destDir) return;
    try {
      await api.files.move(paths, destDir);
      setSelectedPaths(new Set());
      await refreshSelectionParents(paths, [destDir]);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const compress = async (paths: string[], entry?: FileEntry) => {
    if (!paths.length) return;
    const format = prompt('Archive format: zip, tar.gz, 7z', 'zip') as ArchiveFormat | null;
    if (!format) return;
    await compressWithFormat(paths, format, entry);
  };

  const compressWithFormat = async (paths: string[], format: ArchiveFormat, entry?: FileEntry) => {
    if (!paths.length) return;
    if (!archiveFormats.includes(format)) {
      alert('Unsupported archive format');
      return;
    }
    const base = paths.length === 1 ? archiveBaseName(entry) : 'archive';
    const destPath = prompt('Archive path:', `${selectedDir}/${base}.${archiveExtension(format)}`);
    if (!destPath) return;
    try {
      await api.files.archive(paths, destPath, format);
      await refreshSelectionParents(paths, [parentPath(destPath)]);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const extract = async (entry: FileEntry, parentDir: string) => {
    const destDir = prompt('Extract to folder:', `${parentDir}/${archiveBaseName(entry)}`);
    if (!destDir) return;
    try {
      await api.files.extract(entry.path, destDir);
      await refreshDirs([parentDir, destDir]);
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e));
    }
  };

  const onRowClick = (entry: FileEntry, parentDir: string, e: React.MouseEvent) => {
    const isDir = entry.type === 'directory';
    if (multiMode || e.metaKey || e.ctrlKey || e.shiftKey) {
      toggleSelected(entry.path);
      setSelectedDir(isDir ? entry.path : parentDir);
      return;
    }
    setSelectedPaths(new Set());
    if (isDir) toggle(entry.path);
    else {
      setSelectedDir(parentDir);
      onOpenFile(entry);
    }
  };

  const onContextMenu = (entry: FileEntry, parentDir: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedPaths.has(entry.path)) setSelectedPaths(new Set([entry.path]));
    setSelectedDir(entry.type === 'directory' ? entry.path : parentDir);
    setContextMenu({ x: e.clientX, y: e.clientY, entry, parentDir });
  };

  const renderRow = (entry: FileEntry, parentDir: string, depth: number) => {
    const isDir = entry.type === 'directory';
    const isOpen = expanded.has(entry.path);
    const selected = selectedPaths.has(entry.path);
    const isActive = selected || entry.path === activeFilePath || entry.path === selectedDir;
    return (
      <div key={entry.path}>
        <div
          className={`group flex items-center gap-1 pr-1 h-7 rounded cursor-pointer text-sm whitespace-nowrap ${
            isActive ? 'bg-bg-hover text-text' : 'text-text-secondary hover:bg-bg-hover/60'
          }`}
          style={{ paddingLeft: depth * 12 + 4 }}
          onClick={(e) => onRowClick(entry, parentDir, e)}
          onContextMenu={(e) => onContextMenu(entry, parentDir, e)}
        >
          <span className="w-3 flex items-center justify-center shrink-0 text-text-muted">
            {isDir && (isOpen ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />)}
          </span>
          {multiMode && (
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                selected ? 'border-primary bg-primary text-white' : 'border-border text-transparent'
              }`}
            >
              <FaCheck size={9} />
            </span>
          )}
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
              onClick={(e) => (e.stopPropagation(), deletePaths([entry.path]))}
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
                Loading...
              </div>
            ) : (
              (children[entry.path] || []).map((c) => renderRow(c, entry.path, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  const contextPaths = selectionFor(contextMenu?.entry);
  const contextTargetDir = contextMenu?.entry.type === 'directory' ? contextMenu.entry.path : contextMenu?.parentDir;

  return (
    <div className="h-full flex flex-col bg-bg border-r border-border min-w-0">
      <div className="h-10 px-2 flex items-center gap-1 border-b border-border shrink-0">
        <span
          title={rootPath}
          className="text-xs font-semibold uppercase tracking-wider text-text-muted flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {multiMode && selectedPaths.size ? `${selectedPaths.size} selected` : rootPath.replace(/\/+$/, '').split('/').pop() || rootPath}
        </span>
        <button
          title="Multi-select"
          onClick={() => (setMultiMode((v) => !v), setSelectedPaths(new Set()))}
          className={`p-1.5 rounded hover:bg-bg-hover ${multiMode ? 'text-primary' : 'text-text-muted hover:text-text'}`}
        >
          <FaCheck size={13} />
        </button>
        {multiMode && selectedPaths.size > 0 && (
          <>
            <button title="Copy selected" onClick={() => copyToClipboard([...selectedPaths], 'copy')} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
              <FaCopy size={13} />
            </button>
            <button title="Cut selected" onClick={() => copyToClipboard([...selectedPaths], 'cut')} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
              <FaScissors size={13} />
            </button>
            <button title="Move selected" onClick={() => moveTo([...selectedPaths])} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
              <FaFolderOpen size={13} />
            </button>
            <button title="Compress selected" onClick={() => compress([...selectedPaths], selectedEntries()[0])} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
              <FaBoxArchive size={13} />
            </button>
            <button title="Delete selected" onClick={() => deletePaths([...selectedPaths])} className="p-1.5 rounded text-text-muted hover:text-error hover:bg-bg-hover">
              <FaTrash size={13} />
            </button>
          </>
        )}
        {clipboard && (
          <button title={`Paste ${clipboard.paths.length} item${clipboard.paths.length === 1 ? '' : 's'}`} onClick={() => pasteInto(selectedDir)} className="p-1.5 rounded text-primary hover:bg-bg-hover">
            <FaPaste size={13} />
          </button>
        )}
        <button title="New folder" onClick={handleNewFolder} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
          <FaFolderPlus size={13} />
        </button>
        <button title="Upload to selected folder" onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
          <FaUpload size={13} />
        </button>
        <button title="Refresh" onClick={() => load(selectedDir)} className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-hover">
          <FaArrowsRotate size={13} />
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </div>
      {error && <div className="px-3 py-1.5 text-xs text-error break-words">{error}</div>}
      <div className="flex-1 overflow-auto py-1 px-1">
        {(children[rootPath] || []).map((c) => renderRow(c, rootPath, 0))}
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 w-40 rounded-lg border border-border bg-bg-card py-1 text-xs text-text shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover" onClick={() => (copyToClipboard(contextPaths, 'cut'), setContextMenu(undefined))}>
            <FaScissors className="inline mr-2" size={10} /> Cut
          </button>
          <button className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover" onClick={() => (copyToClipboard(contextPaths, 'copy'), setContextMenu(undefined))}>
            <FaCopy className="inline mr-2" size={10} /> Copy
          </button>
          <button
            disabled={!clipboard || !contextTargetDir}
            className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover disabled:opacity-40"
            onClick={() => contextTargetDir && (pasteInto(contextTargetDir), setContextMenu(undefined))}
          >
            <FaPaste className="inline mr-2" size={10} /> Paste here
          </button>
          <button className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover" onClick={() => (moveTo(contextPaths), setContextMenu(undefined))}>
            <FaFolderOpen className="inline mr-2" size={10} /> Move to...
          </button>
          <div className="group relative">
            <button className="flex w-full items-center px-2.5 py-1.5 text-left hover:bg-bg-hover">
              <FaBoxArchive className="mr-2" size={10} />
              <span className="flex-1">Compress</span>
              <FaChevronRight size={9} className="text-text-muted" />
            </button>
            <div className="invisible absolute left-full top-0 w-28 rounded-lg border border-border bg-bg-card py-1 opacity-0 shadow-xl transition-opacity before:absolute before:-left-2 before:top-0 before:h-full before:w-2 before:content-[''] group-hover:visible group-hover:opacity-100">
              {archiveFormats.map((format) => (
                <button
                  key={format}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover"
                  onClick={() => (compressWithFormat(contextPaths, format, contextMenu.entry), setContextMenu(undefined))}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
          {isArchive(contextMenu.entry) && (
            <button className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover" onClick={() => (extract(contextMenu.entry, contextMenu.parentDir), setContextMenu(undefined))}>
              <FaClipboard className="inline mr-2" size={10} /> Extract...
            </button>
          )}
          <div className="my-1 border-t border-border" />
          {contextPaths.length === 1 && (
            <button className="w-full px-2.5 py-1.5 text-left hover:bg-bg-hover" onClick={() => (handleRename(contextMenu.entry, contextMenu.parentDir), setContextMenu(undefined))}>
              <FaPen className="inline mr-2" size={10} /> Rename
            </button>
          )}
          <button className="w-full px-2.5 py-1.5 text-left text-error hover:bg-error/10" onClick={() => (deletePaths(contextPaths), setContextMenu(undefined))}>
            <FaTrash className="inline mr-2" size={10} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
