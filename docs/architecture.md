# Architecture

This document describes the foundation architecture for Personal Dashboard and the reasoning behind major design decisions.

## Goals

- **Widget-first**: every feature is an independent widget
- **Scalable without over-engineering**: simple modules that can grow cleanly
- **Persistence without lock-in**: widgets never touch IndexedDB directly
- **Dashboard ignorance**: the shell knows widget metadata, not widget internals

## High-level structure

```text
┌─────────────────────────────────────────────────────────┐
│ App (main.tsx)                                          │
│  QueryClientProvider · TooltipProvider · DashboardProvider│
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ AppShell                                                │
│  Sidebar · TopNav · DashboardGrid                       │
└───────────────────────────┬─────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
   Widget registry    Storage hooks      React Grid Layout
         │                  │                  │
   WidgetHost ──────► individual widgets
```

## Widget registry

Widgets register through `src/widgets/registry.ts`. The registry is the only place that imports widget definitions.

Each widget exports a `WidgetDefinition`:

- `type` — stable identifier
- `name`, `description`, `icon` — UI metadata
- `defaultSize`, `minSize` — grid defaults
- `component` — widget UI
- `SettingsComponent` — optional settings panel (future)
- `defaultSettings` — optional defaults

The dashboard stores **instances** (`id` + `type`). `WidgetHost` resolves the type to a component at render time.

### Why a registry instead of auto-discovery?

Explicit registration keeps dependency graphs clear, works reliably with Vite bundling, and makes it obvious which widgets ship in the app. Adding a widget is still only two steps: create the folder, add one import.

## Storage layer

IndexedDB is accessed only through:

- `src/storage/db.ts` — database bootstrap (`idb`)
- `src/storage/storageService.ts` — `get`, `set`, `delete`, `clear`
- `src/storage/hooks/useStorageValue.ts` — reactive read/write hook
- `src/storage/hooks/useWidgetStorage.ts` — namespaced widget storage

### Stores

| Store | Purpose |
|-------|---------|
| `layouts` | Widget instances + responsive grid layouts |
| `widget-settings` | Per-instance widget configuration |
| `preferences` | Dashboard preferences (sidebar state, theme) |
| `cache` | Reserved for future API response caching |
| `notes` | Notes widget content (demonstrates domain-specific store use) |

Widgets should use `useWidgetStorage` or `useWidgetSettings` for settings, and `useStorageValue` with an appropriate store for domain data.

### Why abstract storage?

If persistence later moves to SQLite (Capacitor), a sync service, or cloud backup, only the storage layer changes. Widget code stays the same.

## Dashboard state

`useDashboardState` (via `DashboardProvider`) owns:

- widget instances on the dashboard
- responsive layouts for all breakpoints
- `addWidget` / `removeWidget`

Layout and instances are persisted together under `layouts.dashboard-layout` so the grid and widget list stay in sync.

## Layout system

`DashboardGrid` uses **react-grid-layout** (legacy responsive API) with:

- 12 columns on large screens, fewer on smaller breakpoints
- drag handle on `.widget-drag-handle` (widget header)
- vertical compaction
- persisted layouts per breakpoint

The shell is desktop-first: sidebar on `md+`, full-width grid on smaller screens with top-nav widget actions.

## TanStack Query

`queryClient` is configured in `src/services/queryClient.ts` and provided at the app root. Widgets will use `useQuery` / `useMutation` for API data when integrations are added. Cached responses can later be persisted to the `cache` IndexedDB store.

## Capacitor

`capacitor.config.ts` points `webDir` to `dist`. Run `npm run cap:sync` after each production build before opening native projects.

## Theming

Dark mode is the default (`class="dark"` on `<html>`). Theme tokens live in `src/index.css` as CSS variables compatible with shadcn/ui.

## What we deliberately avoided

- Global widget event buses
- Deep inheritance hierarchies for widgets
- Direct IndexedDB access from widgets
- Premature micro-frontend splitting
- Feature flags / plugin loaders before they are needed

These can be added later if the project scale demands them.
