import type { ApiResponse, DashboardConfig, AIProvider, SFTPConnection, WidgetConfig } from '@shared/types/index.js';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request failed');
  return json.data!;
}

export const api = {
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
