# Roadmap

A phased plan for growing Personal Dashboard from foundation to a full personal workspace.

## Phase 1 — Foundation (current)

- [x] Vite + React + TypeScript project setup
- [x] Tailwind CSS + shadcn/ui
- [x] Capacitor configuration
- [x] IndexedDB storage abstraction
- [x] Widget registry and host
- [x] Responsive draggable grid
- [x] Dark theme app shell (sidebar + top nav)
- [x] Placeholder widgets: Weather, Calendar, Notes
- [x] TanStack Query client at app root
- [x] Architecture documentation

## Phase 2 — Widget infrastructure

- [ ] Widget settings panel (modal or slide-over from widget header)
- [ ] Widget duplication
- [ ] Empty dashboard onboarding state with guided first widget
- [ ] Mobile sidebar (sheet/drawer) for widget library
- [ ] Persist and restore scroll positions per widget
- [ ] Export / import dashboard configuration (JSON)

## Phase 3 — Real widget implementations

- [ ] **Weather** — Open-Meteo or similar API, location search, units
- [ ] **Calendar** — Google Calendar or local calendar integration
- [ ] **Notes** — rich text or markdown, multiple notes per instance
- [ ] **Tasks** — simple todo list widget
- [ ] **Clock** — time zones
- [ ] **RSS** — feed reader widget

## Phase 4 — Data and sync

- [ ] TanStack Query persistence to `cache` store
- [ ] Background refresh policies per widget
- [ ] Optional cloud backup of dashboard config
- [ ] Offline-first behaviour indicators

## Phase 5 — Platform

- [ ] Capacitor iOS/Android builds and store assets
- [ ] Native status bar / safe area polish
- [ ] Push notifications (calendar reminders, etc.)
- [ ] Widget deep links

## Phase 6 — Advanced dashboard features

- [ ] Multiple dashboards / workspaces
- [ ] Dashboard templates
- [ ] Keyboard shortcuts
- [ ] Command palette
- [ ] Global search across widget data

## Principles for future work

1. **One widget per feature** — resist putting unrelated UI in the shell
2. **Storage abstraction** — extend stores, not widget imports
3. **Registry registration** — explicit is fine until dozens of widgets justify auto-discovery
4. **Ship incrementally** — each widget should be useful on its own
5. **Desktop-first** — optimize for daily workspace use, then adapt for mobile

## Ideas backlog (unprioritized)

- GitHub activity widget
- Spotify now playing
- Home automation status
- Stock/crypto ticker
- Habit tracker
- Pomodoro timer
- Book reading list
- Photo slideshow
- System metrics (self-hosted)
