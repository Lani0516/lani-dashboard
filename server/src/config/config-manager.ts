import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import type { DashboardConfig, AIProvider, SFTPConnection, WidgetConfig } from '../../../shared/types/index.js';

const CONFIG_PATH = join(process.cwd(), 'data', 'config.json');

const DEFAULT_CONFIG: DashboardConfig = {
  widgets: [],
  theme: 'dark',
  refreshInterval: 5000,
  connections: [],
  aiProviders: [],
};

class ConfigManager {
  private config: DashboardConfig = { ...DEFAULT_CONFIG };

  async load(): Promise<DashboardConfig> {
    try {
      const raw = await readFile(CONFIG_PATH, 'utf-8');
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
      await this.save();
    }
    return this.config;
  }

  async save(): Promise<void> {
    await mkdir(dirname(CONFIG_PATH), { recursive: true });
    await writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2));
  }

  get(): DashboardConfig {
    return this.config;
  }

  async update(partial: Partial<DashboardConfig>): Promise<DashboardConfig> {
    this.config = { ...this.config, ...partial };
    await this.save();
    return this.config;
  }

  async addAIProvider(provider: AIProvider): Promise<void> {
    this.config.aiProviders.push(provider);
    await this.save();
  }

  async removeAIProvider(id: string): Promise<void> {
    this.config.aiProviders = this.config.aiProviders.filter(p => p.id !== id);
    await this.save();
  }

  async addConnection(conn: SFTPConnection): Promise<void> {
    this.config.connections.push(conn);
    await this.save();
  }

  async removeConnection(id: string): Promise<void> {
    this.config.connections = this.config.connections.filter(c => c.id !== id);
    await this.save();
  }

  async updateWidgets(widgets: WidgetConfig[]): Promise<void> {
    this.config.widgets = widgets;
    await this.save();
  }
}

export const configManager = new ConfigManager();
