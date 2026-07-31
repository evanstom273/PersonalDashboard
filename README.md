# Personal Dashboard

A modular personal dashboard built for long-term growth. Features are implemented as independent widgets on a draggable, resizable grid with local persistence via IndexedDB.

## Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- React Grid Layout
- TanStack Query (ready for API integrations)
- IndexedDB via a storage abstraction
- Capacitor (mobile packaging)

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

### Capacitor

```bash
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
```

## Project structure

```text
src/
  components/     Shared UI and widget frame
  widgets/        Widget implementations and registry
  layout/         App shell, sidebar, grid
  services/       App-wide services (query client)
  storage/        IndexedDB layer and hooks
  hooks/          Dashboard hooks
  pages/          Route-level pages
  providers/      React context providers
  types/          Shared TypeScript types
  utils/          Utilities
docs/             Architecture and roadmap
```

## Adding a widget

1. Create a folder under `src/widgets/<name>/`
2. Export a `WidgetDefinition` from `index.ts`
3. Register it in `src/widgets/registry.ts`

See `docs/widgets.md` for details.

## Documentation

- [Architecture](docs/architecture.md)
- [Widgets](docs/widgets.md)
- [Roadmap](docs/roadmap.md)
