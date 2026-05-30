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
  | 'sftp'
  | 'adblock'
  | 'docker'
  | 'uptime'
  | 'disk'
  | 'process'
  | 'sensors';

// ── Adblock (Pi-hole) ──

export interface AdblockStats {
  online: boolean;
  version: 'v5' | 'v6';
  queriesToday: number;
  blockedToday: number;
  blockPercent: number;
  domainsOnBlocklist: number;
  blockingEnabled: boolean;
}

// ── Docker ──

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  cpuPercent: number;
  memUsage: number;
  memLimit: number;
}

export interface DockerStatus {
  available: boolean;
  error?: string;
  containers: DockerContainer[];
}

export interface DockerImage {
  id: string;
  tag: string;
  tags: string[];
  size: number;
}

export interface DockerVolume {
  name: string;
  mountpoint: string;
  driver: string;
}

// ── Uptime ──

export interface UptimeTarget {
  id: string;
  label: string;
  type: 'http' | 'tcp' | 'ping';
  target: string;
  expectedStatus?: number;
}

export interface UptimeProbeResult {
  timestamp: number;
  up: boolean;
  latencyMs: number;
  error?: string;
}

export interface UptimeStatus extends UptimeTarget {
  up: boolean;
  latencyMs: number | null;
  lastError?: string;
  uptimePercent: number;
  history: UptimeProbeResult[];
}

// ── Disk / Storage ──

export interface DiskMount {
  mount: string;
  fsType?: string;
  totalBytes: number;
  usedBytes: number;
  availBytes: number;
  usePercent: number;
  inodesTotal?: number;
  inodesUsed?: number;
  inodesPercent?: number;
}

export interface DiskSmartDevice {
  device: string;
  healthPassed: boolean;
  tempC?: number;
  powerOnHours?: number;
}

export interface DiskSmart {
  available: boolean;
  devices?: DiskSmartDevice[];
}

export interface DiskIo {
  device: string;
  readBps: number;
  writeBps: number;
}

export interface DiskStats {
  mounts: DiskMount[];
  smart: DiskSmart;
  io: DiskIo[];
  timestamp: number;
}

// ── Processes ──

export interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  cpu: number;
  memPercent: number;
  rssBytes: number;
  user: string;
}

export interface ProcessList {
  processes: ProcessInfo[];
  total: number;
  sort: 'cpu' | 'mem';
  timestamp: number;
}

export interface KillResult {
  ok: boolean;
  pid: number;
  signal: 'SIGTERM' | 'SIGKILL';
  error?: string;
}

// ── Sensors ──

export interface CpuTemp {
  zone: string;
  type: string;
  value: number;
}

export interface HwmonReading {
  chip: string;
  label: string;
  type: 'temp' | 'fan';
  value: number;
  unit: '°C' | 'RPM';
}

export interface ThrottleStatus {
  available: boolean;
  raw?: string;
  underVoltageNow?: boolean;
  freqCappedNow?: boolean;
  throttledNow?: boolean;
  softTempLimitNow?: boolean;
  underVoltageOccurred?: boolean;
  freqCappedOccurred?: boolean;
  throttledOccurred?: boolean;
  softTempLimitOccurred?: boolean;
}

export interface SensorsStats {
  cpuTemps: CpuTemp[];
  hwmon: HwmonReading[];
  throttle: ThrottleStatus;
}

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

export type ArchiveFormat = 'zip' | 'tar.gz' | '7z';

export interface FileBatchRequest {
  paths: string[];
}

export interface FileCopyMoveRequest extends FileBatchRequest {
  destDir: string;
}

export interface FileArchiveRequest extends FileBatchRequest {
  destPath: string;
  format: ArchiveFormat;
}

export interface FileExtractRequest {
  archivePath: string;
  destDir: string;
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

// ── Local Sites (listening ports) ──

export interface LocalSite {
  port: number;
  address: string;
  process?: string;
  pid?: number;
  proto: 'http' | 'https' | 'unknown';
  online: boolean;
  statusCode?: number;
  title?: string;
}

export interface NginxDeployRequest {
  name: string;
  serverName: string;
  listenPort: number;
  mode: 'proxy' | 'static';
  upstreamPort?: number;
  root?: string;
}

export interface NginxDeployResult {
  configPath: string;
  enabledPath?: string;
  root?: string;
  tested: boolean;
  reloaded: boolean;
  warnings: string[];
  url: string;
}

// ── Theme ──

export type ThemePalette = 'default' | 'nord' | 'catppuccin';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
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
}

export interface PaletteConfig {
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}

// ── Dashboard Config ──

export interface DashboardConfig {
  widgets: WidgetConfig[];
  palette: ThemePalette;
  mode: ThemeMode;
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
