import { useState } from 'react';
import { WidgetCard } from '../WidgetCard';
import { api } from '../../services/api';
import { useApi } from '../../hooks/useApi';
import type { FileEntry, SFTPConnection, DashboardConfig } from '@shared/types/index.js';

export function SFTPManager() {
  const { data: config } = useApi<DashboardConfig>('/config');
  const [activeConn, setActiveConn] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddConn, setShowAddConn] = useState(false);
  const [connForm, setConnForm] = useState({
    label: '',
    host: '',
    port: '22',
    username: '',
    authType: 'key' as const,
    privateKeyPath: '',
    basePath: '/',
  });

  const connections = config?.connections || [];

  const handleConnect = async (connId: string) => {
    setActiveConn(connId);
    const conn = connections.find(c => c.id === connId);
    const path = conn?.basePath || '/';
    setCurrentPath(path);
    await loadFiles(connId, path);
  };

  const loadFiles = async (connId: string, path: string) => {
    setLoading(true);
    try {
      const data = await api.sftp.list(connId, path);
      setFiles(data);
      setCurrentPath(path);
    } catch (e) {
      console.error('SFTP list error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (file: FileEntry) => {
    if (!activeConn) return;
    if (file.type === 'directory') {
      await loadFiles(activeConn, file.path);
      return;
    }
    setLoading(true);
    try {
      const data = await api.sftp.read(activeConn, file.path);
      setEditingFile({ path: data.path, content: data.content });
    } catch (e) {
      console.error('SFTP read error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeConn || !editingFile) return;
    setLoading(true);
    try {
      await api.sftp.write(activeConn, editingFile.path, editingFile.content);
      setEditingFile(null);
    } catch (e) {
      console.error('SFTP write error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoUp = () => {
    if (!activeConn) return;
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadFiles(activeConn, parent);
  };

  const handleAddConnection = async () => {
    await api.config.addConnection({
      id: crypto.randomUUID(),
      label: connForm.label,
      host: connForm.host,
      port: parseInt(connForm.port),
      username: connForm.username,
      authType: connForm.authType,
      privateKeyPath: connForm.privateKeyPath || undefined,
      basePath: connForm.basePath,
    });
    setConnForm({ label: '', host: '', port: '22', username: '', authType: 'key', privateKeyPath: '', basePath: '/' });
    setShowAddConn(false);
  };

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <WidgetCard
      title="SFTP Manager"
      icon="📁"
      status={activeConn ? 'online' : 'offline'}
      actions={
        <div className="flex gap-1">
          {activeConn && (
            <button
              onClick={() => { setActiveConn(null); setFiles([]); setEditingFile(null); }}
              className="text-xs text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover"
            >
              Disconnect
            </button>
          )}
          <button
            onClick={() => setShowAddConn(!showAddConn)}
            className="text-xs text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover"
          >
            {showAddConn ? 'Cancel' : '+ Conn'}
          </button>
        </div>
      }
    >
      {showAddConn ? (
        <div className="space-y-2">
          <input className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text" placeholder="Label" value={connForm.label} onChange={e => setConnForm({ ...connForm, label: e.target.value })} />
          <div className="flex gap-2">
            <input className="flex-1 bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text" placeholder="Host" value={connForm.host} onChange={e => setConnForm({ ...connForm, host: e.target.value })} />
            <input className="w-16 bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text" placeholder="Port" value={connForm.port} onChange={e => setConnForm({ ...connForm, port: e.target.value })} />
          </div>
          <input className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text" placeholder="Username" value={connForm.username} onChange={e => setConnForm({ ...connForm, username: e.target.value })} />
          <input className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text" placeholder="Private key path (e.g. ~/.ssh/id_rsa)" value={connForm.privateKeyPath} onChange={e => setConnForm({ ...connForm, privateKeyPath: e.target.value })} />
          <input className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text" placeholder="Base path" value={connForm.basePath} onChange={e => setConnForm({ ...connForm, basePath: e.target.value })} />
          <button onClick={handleAddConnection} className="w-full bg-primary text-white rounded px-2 py-1 text-xs hover:opacity-90">
            Add Connection
          </button>
        </div>
      ) : editingFile ? (
        <div className="space-y-2 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-mono truncate">{editingFile.path}</span>
            <div className="flex gap-1">
              <button onClick={handleSave} className="text-xs bg-success text-white px-2 py-0.5 rounded hover:opacity-90">Save</button>
              <button onClick={() => setEditingFile(null)} className="text-xs bg-bg-hover text-text-muted px-2 py-0.5 rounded hover:text-text">Cancel</button>
            </div>
          </div>
          <textarea
            className="flex-1 w-full bg-bg border border-border rounded p-2 text-xs text-text font-mono resize-none min-h-[200px]"
            value={editingFile.content}
            onChange={e => setEditingFile({ ...editingFile, content: e.target.value })}
          />
        </div>
      ) : !activeConn ? (
        <div className="space-y-2">
          {connections.length === 0 && (
            <div className="text-text-muted text-xs text-center py-4">
              No connections. Click + Conn to add one.
            </div>
          )}
          {connections.map((conn) => (
            <button
              key={conn.id}
              onClick={() => handleConnect(conn.id)}
              className="w-full bg-bg-hover rounded-lg p-2 text-left hover:bg-border transition-colors"
            >
              <div className="text-xs text-text font-semibold">{conn.label}</div>
              <div className="text-[10px] text-text-muted font-mono">{conn.username}@{conn.host}:{conn.port}</div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={handleGoUp} className="text-xs bg-bg-hover px-2 py-0.5 rounded text-text-muted hover:text-text">↑ Up</button>
            <span className="text-xs text-text-muted font-mono truncate">{currentPath}</span>
          </div>
          {loading && <div className="text-text-muted text-xs">Loading...</div>}
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => handleOpen(file)}
              className="w-full flex items-center justify-between bg-bg-hover rounded px-2 py-1.5 text-xs hover:bg-border transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>{file.type === 'directory' ? '📂' : '📄'}</span>
                <span className="text-text">{file.name}</span>
              </div>
              <span className="text-text-muted text-[10px]">
                {file.type === 'file' ? formatSize(file.size) : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
