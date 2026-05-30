import { useCallback, useEffect, useState } from 'react';
import {
  FaArrowUpRightFromSquare,
  FaArrowsRotate,
  FaCircle,
  FaFolderOpen,
  FaGlobe,
  FaRocket,
  FaServer,
} from 'react-icons/fa6';
import type { LocalSite, NginxDeployResult } from '@shared/types/index.js';
import { api } from '../services/api';
import { useLocalStorage } from '../hooks/useLocalStorage';

type DeployMode = 'proxy' | 'static';

interface DeployForm {
  name: string;
  serverName: string;
  listenPort: string;
  mode: DeployMode;
  upstreamPort: string;
  root: string;
}

export function Sites() {
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string>();
  const [deployResult, setDeployResult] = useState<NginxDeployResult>();
  const [form, setForm] = useLocalStorage<DeployForm>('nginx-deploy-form', {
    name: 'lani-site',
    serverName: '_',
    listenPort: '8080',
    mode: 'proxy',
    upstreamPort: '5173',
    root: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    api.sites
      .list()
      .then((s) => {
        setSites(s);
        setError(undefined);
      })
      .catch((e) => setError(String(e instanceof Error ? e.message : e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const urlFor = (port: number) => `http://${window.location.hostname}:${port}`;

  const setField = <K extends keyof DeployForm>(key: K, value: DeployForm[K]) => {
    setForm({ ...form, [key]: value });
  };

  const deploy = async () => {
    setDeploying(true);
    setDeployError(undefined);
    setDeployResult(undefined);
    try {
      const result = await api.sites.deployNginx({
        name: form.name,
        serverName: form.serverName,
        listenPort: Number(form.listenPort),
        mode: form.mode,
        upstreamPort: form.mode === 'proxy' ? Number(form.upstreamPort) : undefined,
        root: form.mode === 'static' ? form.root : undefined,
      });
      setDeployResult(result);
      load();
    } catch (e) {
      setDeployError(String(e instanceof Error ? e.message : e));
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FaServer size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-text">Nginx Quick Deploy</h2>
              <p className="truncate text-xs text-text-muted">Create config, test nginx, reload service</p>
            </div>
          </div>
          <div className="flex shrink-0 rounded-md border border-border bg-bg-hover p-0.5">
            {(['proxy', 'static'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setField('mode', mode)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  form.mode === mode ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                }`}
              >
                {mode === 'proxy' ? 'Proxy' : 'Static'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Name</span>
              <input
                className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 text-sm text-text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="lani-site"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Server name</span>
              <input
                className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 text-sm text-text"
                value={form.serverName}
                onChange={(e) => setField('serverName', e.target.value)}
                placeholder="_ or app.local"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-semibold uppercase text-text-muted">Listen port</span>
              <input
                className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 font-mono text-sm text-text"
                value={form.listenPort}
                onChange={(e) => setField('listenPort', e.target.value)}
                inputMode="numeric"
              />
            </label>
            {form.mode === 'proxy' ? (
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase text-text-muted">Upstream</span>
                <select
                  className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 font-mono text-sm text-text"
                  value={form.upstreamPort}
                  onChange={(e) => setField('upstreamPort', e.target.value)}
                >
                  <option value={form.upstreamPort}>:{form.upstreamPort}</option>
                  {sites.map((site) => (
                    <option key={site.port} value={String(site.port)}>
                      :{site.port} {site.title || site.process || ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="space-y-1">
                <span className="text-[11px] font-semibold uppercase text-text-muted">Root</span>
                <input
                  className="w-full rounded-md border border-border bg-bg-hover px-3 py-2 text-sm text-text"
                  value={form.root}
                  onChange={(e) => setField('root', e.target.value)}
                  placeholder="default: ~/Sites/name"
                />
              </label>
            )}
          </div>

          <button
            onClick={deploy}
            disabled={deploying}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 lg:self-end"
          >
            <FaRocket size={13} />
            {deploying ? 'Deploying' : 'Deploy'}
          </button>
        </div>

        {(deployError || deployResult) && (
          <div className="px-4 pb-4">
            {deployError && (
              <div className="rounded-md border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
                {deployError}
              </div>
            )}
            {deployResult && (
              <div className="space-y-1 rounded-md border border-border bg-bg-hover px-3 py-2 text-xs text-text-muted">
                <div className="flex items-center gap-2 text-text">
                  <FaFolderOpen size={12} />
                  <span className="truncate font-mono">{deployResult.configPath}</span>
                </div>
                <div>
                  {deployResult.tested ? 'nginx -t ok' : 'nginx -t failed'} |{' '}
                  {deployResult.reloaded ? 'reloaded' : 'not reloaded'} |{' '}
                  <a className="text-primary hover:underline" href={deployResult.url} target="_blank" rel="noreferrer">
                    {deployResult.url}
                  </a>
                </div>
                {deployResult.warnings.map((warning) => (
                  <div key={warning} className="text-warning">
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-text">Local Sites</h2>
          <p className="text-xs text-text-muted">HTTP 200 sites detected on this host</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-primary hover:text-text disabled:opacity-50"
        >
          <FaArrowsRotate size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {!error && sites.length === 0 && !loading && (
        <div className="text-sm text-text-muted">No HTTP 200 sites found.</div>
      )}

      <div className="flex flex-col gap-2">
        {sites.map((s) => (
          <div
            key={s.port}
            className="flex items-center gap-3 rounded-lg border border-border bg-bg-card px-4 py-3"
          >
            <FaGlobe className="shrink-0 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">:{s.port}</span>
                {s.process && (
                  <span className="truncate text-xs text-text-secondary">{s.process}</span>
                )}
                {s.title && (
                  <span className="truncate text-xs text-text-muted">- {s.title}</span>
                )}
              </div>
              <div className="text-[11px] text-text-muted">
                {s.address}
                {s.statusCode ? ` | HTTP ${s.statusCode}` : ''}
              </div>
            </div>
            <FaCircle
              size={8}
              className={s.online ? 'shrink-0 text-success' : 'shrink-0 text-text-muted/40'}
              title={s.online ? 'Responding to HTTP' : 'No HTTP response'}
            />
            <a
              href={urlFor(s.port)}
              target="_blank"
              rel="noreferrer"
              title="Open"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-primary hover:text-primary"
            >
              <FaArrowUpRightFromSquare size={12} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
