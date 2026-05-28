// ── Widget System ──

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  settings: Record<string, unknown>;
  enabled: boolean;
}

export type WidgetType =
  | 'system-monitor'
  | 'ai-tokens'
  | 'discord'
  | 'minecraft'
  | 'vpn'
  | 'wol'
  | 'network'
  | 'sftp';

// ── System Monitor ──

export interface SystemStats {
  cpu: { usage: number; cores: number; model: string; temp?: number };
  memory: { total: number; used: number; free: number };
  network: {
    interfaces: NetworkInterface[];
    totalRx: number;
    totalTx: number;
  };
  uptime: number;
  loadAvg: [number, number, number];
  timestamp: number;
}

export interface NetworkInterface {
  name: string;
  rxBytes: number;
  txBytes: number;
  rxSpeed: number;
  txSpeed: number;
}

export interface ConnectedDevice {
  ip: string;
  mac: string;
  hostname?: string;
  vendor?: string;
  online: boolean;
  lastSeen: number;
}

// ── AI Token Tracking ──

export interface AIProvider {
  id: string;
  name: string;
  type: 'anthropic' | 'openai' | 'custom';
  apiKey: string;
  orgId?: string;
}

export interface AIUsageData {
  providerId: string;
  accountLabel: string;
  period: { start: string; end: string };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
    currency: string;
  };
  limit?: {
    total: number;
    remaining: number;
    resetsAt: string;
  };
}

// ── Discord ──

export interface DiscordGuildInfo {
  id: string;
  name: string;
  icon?: string;
  memberCount: number;
  onlineCount: number;
  channels: DiscordChannel[];
  boostLevel: number;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  memberCount?: number;
}

// ── Minecraft ──

export interface MinecraftServerStatus {
  online: boolean;
  host: string;
  port: number;
  motd: string;
  players: { online: number; max: number; list: string[] };
  version: string;
  latency: number;
}

export interface SFTPConnection {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  authType: 'key' | 'password';
  privateKeyPath?: string;
  basePath: string;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  size: number;
  modified: number;
  permissions: string;
}

// ── VPN (placeholder) ──

export interface VPNStatus {
  connected: boolean;
  provider: 'wireguard' | 'tailscale' | 'openvpn';
  peers: VPNPeer[];
  uptime?: number;
}

export interface VPNPeer {
  name: string;
  ip: string;
  lastSeen: number;
  rxBytes: number;
  txBytes: number;
  online: boolean;
}

// ── WOL ──

export interface WOLDevice {
  id: string;
  name: string;
  mac: string;
  ip?: string;
  broadcastAddress?: string;
  lastWoken?: number;
}

// ── Theme ──

export type ThemeId = 'dark' | 'light' | 'midnight' | 'nord' | 'catppuccin';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  colors: {
    bg: string;
    bgCard: string;
    bgHover: string;
    text: string;
    textMuted: string;
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    border: string;
  };
}

// ── Dashboard Config ──

export interface DashboardConfig {
  widgets: WidgetConfig[];
  theme: ThemeId;
  refreshInterval: number;
  connections: SFTPConnection[];
  aiProviders: AIProvider[];
  discordBotToken?: string;
  discordGuildId?: string;
}

// ── API Response ──

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
