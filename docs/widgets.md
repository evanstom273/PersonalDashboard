# Widgets

How to create, register, and maintain widgets in Personal Dashboard.

## Widget contract

Every widget is a folder under `src/widgets/` with:

```text
widgets/
  my-widget/
    MyWidget.tsx      # Main UI component
    index.ts          # WidgetDefinition export
```

### WidgetDefinition

```typescript
export const myWidget: WidgetDefinition = {
  type: 'my-widget',           // unique, kebab-case
  name: 'My Widget',
  description: 'Short description for the widget library',
  icon: SomeLucideIcon,
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 2, h: 2 },     // optional
  component: MyWidget,
  defaultSettings: { ... },    // optional
}
```

### Component props

Widget components receive:

```typescript
interface WidgetComponentProps {
  instanceId: string
}
```

`instanceId` is the unique ID for this widget instance on the dashboard. Use it for all per-instance storage.

## Storage in widgets

**Do not import `idb` or `storage/db` in widgets.**

Use:

### Settings (configuration)

```typescript
import { useWidgetSettings } from '@/widgets/registry'

const { settings, setSettings, isLoading } = useWidgetSettings(instanceId, {
  refreshInterval: 15,
})
```

Settings are stored in `widget-settings` under `${instanceId}:settings`.

### Domain data

```typescript
import { useStorageValue } from '@/storage/hooks/useStorageValue'
import { STORAGE_STORES } from '@/storage/types'

const { value, setValue, isLoading } = useStorageValue(
  STORAGE_STORES.NOTES,
  instanceId,
  '',
)
```

Choose the store that fits the data (`notes`, `cache`, or a new store added in `storage/types.ts` and `storage/db.ts`).

## UI conventions

- Use `WidgetFrame` for consistent headers and drag handles
- Put `widget-drag-handle` on the draggable header area (included in `WidgetFrame`)
- Keep widget UI self-contained — no imports from other widget folders
- Handle `isLoading` from storage hooks

## Registering a widget

1. Create the widget folder and definition
2. Import and add to the array in `src/widgets/registry.ts`:

```typescript
import { myWidget } from './my-widget'

const widgetDefinitions: WidgetDefinition[] = [
  weatherWidget,
  calendarWidget,
  notesWidget,
  myWidget,
]
```

The widget appears automatically in:

- Sidebar widget library
- Top nav "Add widget" menu
- Default size when added to the grid

## Widget lifecycle

| Action | Mechanism |
|--------|-----------|
| Add | `addWidget(type)` — creates instance + layout item |
| Remove | `removeWidget(instanceId)` — removes instance + layout items |
| Move / resize | React Grid Layout → `onLayoutChange` → persisted layouts |
| Configure | Widget-owned settings via storage hooks (future settings panel) |

## Data fetching (future)

Use TanStack Query inside the widget component:

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['weather', settings.location],
  queryFn: () => fetchWeather(settings.location),
})
```

Keep query keys scoped by `instanceId` or settings as needed.

## Placeholder widgets

The foundation includes three placeholders:

| Widget | Demonstrates |
|--------|----------------|
| Weather | Settings via `useWidgetSettings`, static placeholder UI |
| Calendar | Settings + list placeholder UI |
| Notes | Settings + domain data in `notes` store with live persistence |

## Checklist for a new widget

- [ ] Folder under `src/widgets/<name>/`
- [ ] `WidgetDefinition` exported from `index.ts`
- [ ] Registered in `registry.ts`
- [ ] Uses storage hooks, not direct IndexedDB
- [ ] Uses `WidgetFrame` (or documents why not)
- [ ] Handles loading state
- [ ] No imports from other widgets
