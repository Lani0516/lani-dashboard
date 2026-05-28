import type { AIProvider, AIUsageData } from '../../../../shared/types/index.js';
import { configManager } from '../../config/config-manager.js';

async function fetchAnthropicUsage(provider: AIProvider): Promise<AIUsageData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const res = await fetch('https://api.anthropic.com/v1/organizations/usage', {
      headers: {
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!res.ok) {
      return makeEmptyUsage(provider, `API error: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;
    return {
      providerId: provider.id,
      accountLabel: provider.name,
      period: {
        start: startOfMonth.toISOString(),
        end: now.toISOString(),
      },
      usage: {
        inputTokens: (data as any).input_tokens ?? 0,
        outputTokens: (data as any).output_tokens ?? 0,
        totalCost: (data as any).total_cost ?? 0,
        currency: 'USD',
      },
      limit: (data as any).limit
        ? {
            total: (data as any).limit.total,
            remaining: (data as any).limit.remaining,
            resetsAt: (data as any).limit.resets_at,
          }
        : undefined,
    };
  } catch (e) {
    return makeEmptyUsage(provider, String(e));
  }
}

async function fetchOpenAIUsage(provider: AIProvider): Promise<AIUsageData> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = now.toISOString().split('T')[0];

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${provider.apiKey}`,
    };
    if (provider.orgId) headers['OpenAI-Organization'] = provider.orgId;

    const res = await fetch(
      `https://api.openai.com/v1/usage?start_date=${startDate}&end_date=${endDate}`,
      { headers }
    );

    if (!res.ok) {
      return makeEmptyUsage(provider, `API error: ${res.status}`);
    }

    const data = await res.json() as Record<string, unknown>;
    return {
      providerId: provider.id,
      accountLabel: provider.name,
      period: { start: startOfMonth.toISOString(), end: now.toISOString() },
      usage: {
        inputTokens: (data as any).total_tokens ?? 0,
        outputTokens: 0,
        totalCost: (data as any).total_cost ?? 0,
        currency: 'USD',
      },
    };
  } catch (e) {
    return makeEmptyUsage(provider, String(e));
  }
}

function makeEmptyUsage(provider: AIProvider, _error?: string): AIUsageData {
  const now = new Date();
  return {
    providerId: provider.id,
    accountLabel: provider.name,
    period: {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      end: now.toISOString(),
    },
    usage: { inputTokens: 0, outputTokens: 0, totalCost: 0, currency: 'USD' },
  };
}

export async function getAllAIUsage(): Promise<AIUsageData[]> {
  const providers = configManager.get().aiProviders;
  return Promise.all(
    providers.map((p) => {
      switch (p.type) {
        case 'anthropic':
          return fetchAnthropicUsage(p);
        case 'openai':
          return fetchOpenAIUsage(p);
        default:
          return Promise.resolve(makeEmptyUsage(p));
      }
    })
  );
}

export async function getAIUsageByProvider(id: string): Promise<AIUsageData | null> {
  const provider = configManager.get().aiProviders.find(p => p.id === id);
  if (!provider) return null;

  switch (provider.type) {
    case 'anthropic':
      return fetchAnthropicUsage(provider);
    case 'openai':
      return fetchOpenAIUsage(provider);
    default:
      return makeEmptyUsage(provider);
  }
}
