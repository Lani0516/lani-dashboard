---
name: add-widget
description: Add a new feature module + dashboard widget to lani-dashboard. Use whenever the task is "add a widget", "add a panel", "new dashboard module/feature", or wiring a server module to a client widget. Captures the full server↔shared↔client pattern so no re-reading of existing modules is needed.
---

# Add a widget / feature module to lani-dashboard

End-to-end recipe for adding ONE feature. A feature = a server module (data) + a shared type + a client widget (UI) + wiring. Follow the steps in order. Every file path below is real and current.

## Conventions (memorize, don't re-derive)
- **Package manager: `bun`**, never npm.
- **Server is ESM**: every relative import ends in `.js` (even for `.ts` files). Shared types imported as `'../../../../shared/types/index.js'` from a module, depth-adjusted.
- **Client imports shared types** via alias `@shared/types/index.js`.
- **API envelope**: every server response is `{ ok: boolean, data?: T, error?: string, timestamp: number }`. Type is `ApiResponse<T>`.
- All `/api/*` routes sit behind `authMiddleware` automatically — no per-route auth needed.
- Type check from `client/`: `cd client && npx tsc --noEmit`. Server has no separate typecheck step; relies on tsx runtime.
- Don't start the dev server — user runs `bun run dev` themselves.

## Step 1 — Shared type
File: `shared/types/index.ts`. Add an interface for the widget's data shape, grouped with a `// ── Name ──` comment header (match existing style). If the widget is selectable as a config widget, also add its key to the `WidgetType` union (line ~13). Example shape: see `AdblockStats`.

## Step 2 — Server module
Create `server/src/modules/<name>/service.ts` and `router.ts`.

`service.ts` — pure business logic, returns the shared type. No Express here. Use `fetch` with `AbortSignal.timeout(5000)` for outbound calls. Read local system data via `node:fs`, `node:os`, child_process, or `/proc`. Import shared type: `import type { Foo } from '../../../../shared/types/index.js';`

`router.ts` — thin Express layer. Pattern:
```ts
import { Router } from 'express';
import { getFoo } from './service.js';

export const fooRouter = Router();

fooRouter.get('/stats', async (req, res) => {
  try {
    const data = await getFoo(/* parse req.query */);
    res.json({ ok: true, data, timestamp: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e instanceof Error ? e.message : e), timestamp: Date.now() });
  }
});
```
Validate required query params → return `400 { ok:false, error:'x required' }`.

## Step 3 — Register router
File: `server/src/index.ts`.
1. Import: `import { fooRouter } from './modules/foo/router.js';` (with the other module imports).
2. Mount: `app.use('/api/foo', fooRouter);` (in the `app.use('/api/...')` block).

## Step 4 — (optional) Real-time via WebSocket
Only if the widget needs push updates instead of polling. In `server/src/polling.ts`, inside `poll()`, call `broadcastUpdate(wss, 'foo:stats', data)`. Client subscribes via `useWebSocket` (see `hooks/useWebSocket.ts`). Most widgets just poll with `useApi` — prefer that unless data must be live (system stats does WS).

## Step 5 — Client API (optional)
If the widget POSTs/mutates, add a namespace to `client/src/services/api.ts` `api` object (e.g. `foo: { wake: () => request<void>('/foo/x', {...}) }`). For simple GET polling you can skip this and let the widget call `useApi` directly.

## Step 6 — Widget component
Create `client/src/components/widgets/FooWidget.tsx`. Template (mirror `AdblockWidget.tsx`):
```tsx
import { FaIcon, FaArrowsRotate } from 'react-icons/fa6';
import { WidgetCard } from '../WidgetCard';
import { useApi } from '../../hooks/useApi';
import type { Foo } from '@shared/types/index.js';

export function FooWidget() {
  const { data, loading, error, refetch } = useApi<Foo>('/foo/stats', 30000); // ms poll, omit for once
  const online = !!data && !error;
  return (
    <WidgetCard
      title="Foo"
      icon={<FaIcon />}
      status={loading ? 'loading' : online ? 'online' : 'offline'}
      actions={
        <button onClick={refetch} className="text-text-muted hover:text-text px-2 py-1 rounded bg-bg-hover flex items-center transition-colors" title="Refresh">
          <FaArrowsRotate size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      <div className="space-y-3">
        {error && <div className="text-error text-xs">{error}</div>}
        {data && online && (/* render data */)}
      </div>
    </WidgetCard>
  );
}
```
- Per-widget user settings: persist with `useLocalStorage('<name>-settings', {...})` (see AdblockWidget) — do NOT round-trip through server config unless the value is server-side (API keys, SSH creds).
- Use only theme Tailwind classes: `bg-bg`, `bg-bg-card`, `bg-bg-hover`, `text-text`, `text-text-secondary`, `text-text-muted`, `border-border`, `text-primary`, `bg-primary`, `text-error`, `text-success`, `text-warning`. Never hardcode hex colors.

## Step 7 — Wire widget into App.tsx
File: `client/src/App.tsx`. Five edits:
1. Import the component near the other widget imports.
2. Ensure its icon is in the `react-icons/fa6` import line.
3. Add an entry to `widgetMap`: `foo: { label: 'Foo', icon: <FaIcon />, render: () => <FooWidget /> },`
4. Add layout entries to `defaultLayouts` for `lg` and `sm` (and the second lg block if present): `{ i: 'foo', x: 0, y: 0, w: 4, h: 4 }`. `cols`: lg=12, md=10, sm=6; `rowHeight=60`.
5. `defaultWidgets` is derived from `widgetMap` keys — new widget auto-included unless you filter it (ai-tokens is filtered out by default).

The `widgetMap` key must match the layout `i` and the localStorage `dashboard-widgets` entries. Keep one consistent key string everywhere.

## Step 8 — Config (only if server needs to persist settings)
If the feature stores server-side config (API keys, connection lists), extend `DashboardConfig` in shared types, add accessor methods to `server/src/config/config-manager.ts`, and expose via `config/router.ts` + `api.config` in `client/src/services/api.ts`. Skip entirely for client-only/localStorage widgets.

## Step 9 — Verify
`cd client && npx tsc --noEmit`. Confirm no type errors. Tell user to add the widget via dashboard Edit mode (it shows under "Add:" if not in defaults). Do not launch dev server.

## Full-page tool view (optional, richer than a widget)
A feature can also get a dedicated sidebar view (a full page, like Dashboard/Workspace/Sites), in addition to or instead of its grid widget. Pattern in `client/src/App.tsx`:
- Build the page component at `client/src/components/tools/<Name>Tool.tsx`, root `<div className="p-6 space-y-6 h-full overflow-auto">`, reusing the same `/api/<module>` endpoints.
- Register it in the `toolPages` object (key, label, icon, render) near `widgetMap`. `ToolKey`, `isToolKey`, the `View` union, `pageTitle`, the sidebar "Tools" section, and the render switch are all driven off `toolPages` — adding one entry there wires the whole view. No other App.tsx edits needed beyond importing the component.
- Tool views render inside `h-screen overflow-hidden` (the page itself scrolls via the tool root's `overflow-auto`); the dashboard Edit button is hidden on non-dashboard views automatically.

## Universality note
This dashboard targets everything from Raspberry Pi to OCI VPS. For modules reading host data, **feature-detect** (check a binary exists / file readable) and degrade gracefully — return `online:false` or an informative error rather than throwing on a host that lacks `docker`/`smartctl`/`vcgencmd`. Keep base modules dependent only on `/proc` + standard tools so a Pi Zero still runs them.
