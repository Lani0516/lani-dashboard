# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` for agent-level standing instructions, including package manager, commit conventions, memory habit, code style, response style, and Agent skills configuration.

## Commands

```bash
# Install all deps (use bun, not npm)
bun install && cd server && bun install && cd ../client && bun install && cd ..

# Dev — runs server + client concurrently
bun run dev

# Dev individually
bun run dev:server    # Express on :3001
bun run dev:client    # Vite on :5173 (proxies /api → :3001)

# Build client
bun run build

# Production — serves built client from server
bun run start

# Type check (from client/)
cd client && npx tsc --noEmit
```

No test framework configured yet.

## Architecture

Monorepo with three packages: `client/`, `server/`, `shared/`.

### Shared (`shared/types/index.ts`)
Single source of truth for all TypeScript interfaces used by both client and server. Imported via `@shared/types/index.js` path alias.

### Server (`server/src/`)
Express + WebSocket. Each feature is a **module** under `modules/` with its own `router.ts` (Express routes) and `service.ts` (business logic). All routes mounted at `/api/<module>`.

- **Config system**: `config/config-manager.ts` — singleton that reads/writes `server/data/config.json`. All runtime config (AI providers, SFTP connections, widget layout, Discord tokens) lives here. Exposed via `/api/config`.
- **WebSocket**: `ws.ts` exports `broadcastUpdate()`. `polling.ts` periodically pushes system stats to all WS clients.
- **Module pattern**: To add a new module, create `modules/<name>/router.ts` + `service.ts`, register the router in `index.ts`.

Active modules: `system`, `ai-tokens`, `discord`, `minecraft` (includes SFTP via `sftp-router.ts`), `vpn` (placeholder), `wol`, `network` (placeholder).

### Client (`client/src/`)
React 19 + Vite + Tailwind CSS 3. Grid layout via `react-grid-layout`.

- **Theme system**: CSS custom properties (`--color-*`), mapped in `tailwind.config.js` so Tailwind classes like `bg-bg-card`, `text-primary` use theme vars. Themes defined in `themes/themes.ts`, applied by setting CSS vars on `:root`. 5 presets: dark, light, midnight, nord, catppuccin.
- **Widget pattern**: Each widget in `components/widgets/` is a self-contained component using `<WidgetCard>` wrapper. Widgets fetch their own data via `useApi` hook or receive real-time updates via `useWebSocket` hook.
- **API layer**: `services/api.ts` wraps all fetch calls. `hooks/useApi.ts` provides polling with interval. `hooks/useWebSocket.ts` handles WS connection with auto-reconnect.
- **Layout persistence**: Grid layout saved to `localStorage` key `dashboard-layouts`.

### Key conventions
- All server imports use `.js` extension (ESM)
- Vite proxies `/api` and `/ws` to server in dev
- AI providers and SFTP connections are configured at runtime through the dashboard UI, stored in `server/data/config.json`
- Discord bot token can come from `.env` or runtime config
