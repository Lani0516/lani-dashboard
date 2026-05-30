import type { ApiResponse, ArchiveFormat, DashboardConfig, AIProvider, SFTPConnection, WidgetConfig, FileEntry, LocalSite, NginxDeployRequest, NginxDeployResult } from '@shared/types/index.js';

const TOKEN_KEY = 'dashboard-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: authHeaders({ 'Content-Type': 'application/json', ...(options?.headers || {}) }),
  });
  if (res.status === 401) throw new Error('Unauthorized');
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data!;
}

interface FileContent { path: string; content: string }

export const api = {
  auth: {
    status: () => request<{ authEnabled: boolean }>('/auth/status'),
  },
  files: {
    root: () => request<{ root: string }>('/files/root'),
    list: (path?: string) =>
      request<FileEntry[]>(`/files/list${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    read: (path: string) => request<FileContent>(`/files/read?path=${encodeURIComponent(path)}`),
    write: (path: string, content: string) =>
      request<void>('/files/write', { method: 'PUT', body: JSON.stringify({ path, content }) }),
    mkdir: (path: string) =>
      request<void>('/files/mkdir', { method: 'POST', body: JSON.stringify({ path }) }),
    delete: (path: string) =>
      request<void>(`/files/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
    deleteBatch: (paths: string[]) =>
      request<void>('/files/delete-batch', { method: 'POST', body: JSON.stringify({ paths }) }),
    rename: (from: string, to: string) =>
      request<void>('/files/rename', { method: 'POST', body: JSON.stringify({ from, to }) }),
    copy: (paths: string[], destDir: string) =>
      request<void>('/files/copy', { method: 'POST', body: JSON.stringify({ paths, destDir }) }),
    move: (paths: string[], destDir: string) =>
      request<void>('/files/move', { method: 'POST', body: JSON.stringify({ paths, destDir }) }),
    archive: (paths: string[], destPath: string, format: ArchiveFormat) =>
      request<{ path: string }>('/files/archive', { method: 'POST', body: JSON.stringify({ paths, destPath, format }) }),
    extract: (archivePath: string, destDir: string) =>
      request<void>('/files/extract', { method: 'POST', body: JSON.stringify({ archivePath, destDir }) }),
    async download(path: string, name: string) {
      const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    },
    async upload(dir: string, file: File) {
      const res = await fetch(
        `/api/files/upload?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(file.name)}`,
        { method: 'POST', headers: authHeaders(), body: file }
      );
      const json: ApiResponse<unknown> = await res.json();
      if (!json.ok) throw new Error(json.error || 'Upload failed');
    },
  },
  config: {
    get: () => request<DashboardConfig>('/config'),
    update: (data: Partial<DashboardConfig>) =>
      request<DashboardConfig>('/config', { method: 'PUT', body: JSON.stringify(data) }),
    addAIProvider: (provider: AIProvider) =>
      request<AIProvider[]>('/config/ai-providers', { method: 'POST', body: JSON.stringify(provider) }),
    removeAIProvider: (id: string) =>
      request<void>(`/config/ai-providers/${id}`, { method: 'DELETE' }),
    addConnection: (conn: SFTPConnection) =>
      request<SFTPConnection[]>('/config/connections', { method: 'POST', body: JSON.stringify(conn) }),
    removeConnection: (id: string) =>
      request<void>(`/config/connections/${id}`, { method: 'DELETE' }),
    updateWidgets: (widgets: WidgetConfig[]) =>
      request<WidgetConfig[]>('/config/widgets', { method: 'PUT', body: JSON.stringify({ widgets }) }),
  },
  sites: {
    list: () => request<LocalSite[]>('/sites/list'),
    deployNginx: (data: NginxDeployRequest) =>
      request<NginxDeployResult>('/sites/nginx/deploy', { method: 'POST', body: JSON.stringify(data) }),
  },
  wol: {
    wake: (mac: string, broadcastAddress?: string) =>
      request<void>('/wol/wake', { method: 'POST', body: JSON.stringify({ mac, broadcastAddress }) }),
  },
  sftp: {
    list: (connectionId: string, path?: string) =>
      request<any>(`/sftp/${connectionId}/list${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    read: (connectionId: string, path: string) =>
      request<any>(`/sftp/${connectionId}/read?path=${encodeURIComponent(path)}`),
    write: (connectionId: string, path: string, content: string) =>
      request<void>(`/sftp/${connectionId}/write`, { method: 'PUT', body: JSON.stringify({ path, content }) }),
    delete: (connectionId: string, path: string) =>
      request<void>(`/sftp/${connectionId}/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  },
};
