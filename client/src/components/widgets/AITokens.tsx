import { useState } from 'react';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import type { AIUsageData, AIProvider } from '@shared/types/index.js';

export function AITokens() {
  const { data: usage, loading, refetch } = useApi<AIUsageData[]>('/ai-tokens', 60000);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'anthropic' as AIProvider['type'],
    apiKey: '',
    orgId: '',
  });

  const handleAdd = async () => {
    await api.config.addAIProvider({
      id: crypto.randomUUID(),
      name: form.name,
      type: form.type,
      apiKey: form.apiKey,
      orgId: form.orgId || undefined,
    });
    setForm({ name: '', type: 'anthropic', apiKey: '', orgId: '' });
    setShowAdd(false);
    refetch();
  };

  const handleRemove = async (id: string) => {
    await api.config.removeAIProvider(id);
    refetch();
  };

  return (
    <WidgetCard
      title="AI Tokens"
      icon="🤖"
      status={loading ? 'loading' : 'online'}
      actions={
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover"
        >
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      {showAdd ? (
        <div className="space-y-2">
          <input
            className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
            placeholder="Account name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as AIProvider['type'] })}
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (Codex)</option>
            <option value="custom">Custom</option>
          </select>
          <input
            className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
            placeholder="API Key"
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          {form.type === 'openai' && (
            <input
              className="w-full bg-bg-hover border border-border rounded px-2 py-1 text-xs text-text"
              placeholder="Org ID (optional)"
              value={form.orgId}
              onChange={(e) => setForm({ ...form, orgId: e.target.value })}
            />
          )}
          <button
            onClick={handleAdd}
            className="w-full bg-primary text-white rounded px-2 py-1 text-xs hover:opacity-90"
          >
            Add Provider
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(!usage || usage.length === 0) && (
            <div className="text-text-muted text-xs text-center py-4">
              No AI providers configured. Click + Add to get started.
            </div>
          )}
          {(usage || []).map((u) => (
            <div key={u.providerId} className="bg-bg-hover rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text">{u.accountLabel}</span>
                <button
                  onClick={() => handleRemove(u.providerId)}
                  className="text-error text-xs hover:opacity-70"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-text-muted">Input</div>
                  <div className="text-text font-mono">{(u.usage.inputTokens / 1000).toFixed(1)}K</div>
                </div>
                <div>
                  <div className="text-text-muted">Output</div>
                  <div className="text-text font-mono">{(u.usage.outputTokens / 1000).toFixed(1)}K</div>
                </div>
              </div>

              {u.usage.totalCost > 0 && (
                <div className="text-xs">
                  <span className="text-text-muted">Cost: </span>
                  <span className="text-warning font-mono">${u.usage.totalCost.toFixed(2)}</span>
                </div>
              )}

              {u.limit && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted">Remaining</span>
                    <span className="text-text">${u.limit.remaining.toFixed(2)} / ${u.limit.total.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg rounded-full">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(u.limit.remaining / u.limit.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="text-[10px] text-text-muted">
                Period: {new Date(u.period.start).toLocaleDateString()} — {new Date(u.period.end).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
