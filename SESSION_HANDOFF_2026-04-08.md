# Session Handoff — 2026-04-08

## Commits this session

| SHA | Summary |
|---|---|
| `b86691c` | feat: keyboard shortcuts panel, validation overlay, minimap, rubber-band, schema tabs, undo/redo, clipboard, MCP sync, canvas snapshot |
| `ace26a9` | fix(validation): try/catch around all rules + per-listener isolation in Redux store |
| `32d0271` | fix(duplicate-entity): idempotent registerEntity + factory early-return; fix prop key uniqueness |
| `d87ca6c` | feat(validation): Rule 1 — entity with zero properties; null-guard `entity.properties ?? []` in property bridge |
| `30a154b` | feat(export): plugin registry + 5 built-in plugins + Settings → Export Plugins tab + toolbar dropdown |

All commits are on `main` and already pushed to origin.

---

## 1. Validation System Hardening

### Files changed
- `src/core/create-redux-store.ts`
- `src/core/validation/create-schema-validator.ts`
- `src/core/adapters/legacy-property-bridge.ts`

### What was done
`runRules()` is now wrapped in a top-level `try/catch` that returns the previous warning list on error, preventing a validator crash from blanking the overlay.

Each Redux `listeners.forEach` call (in `dispatch`, `undo`, `redo`) now wraps individual listeners in `try/catch` so one bad subscriber cannot prevent others from running.

`legacy-property-bridge.ts` guards every `entity.properties` access with `?? []` because old localStorage data may have serialized entities without that field.

### Validation rules (current)
| Rule | Trigger | Message |
|---|---|---|
| `no-properties` | Entity has 0 properties | `"X" has no properties defined` |
| `duplicate-names` | Two or more entities share a name (case-insensitive) | `Duplicate entity name "X"` |
| `duplicate-prop-keys` | Two properties in the same entity share a key | `Duplicate property key "k" in "X"` |
| `mn-no-pivot` | M:N link exists but no pivot entity is present | `M:N between "A" and "B" — consider adding a pivot entity` |

---

## 2. Duplicate Entity on Link Drag (ghost node bug)

### Files changed
- `src/core/create-entity-registry.ts`
- `src/features/entity-with-edges/create-interactive-entity-demo.ts`

### Root cause
When a link was dragged to empty canvas, `spawnFactory` called `canvasAdapter.createEntity()` which synchronously fired the `EntityCreated` EventBus event. The EventBus handler spawned + registered instance #1 **before `spawnFactory` returned**. Then `spawnFactory` created instance #2 (orphaned DOM tree), and the Map was overwritten with #2, leaving #1 as a permanent DOM ghost.

### Fix
`registerEntity` now checks `workspaceState.value.entities.has(entity.id)` and returns early if the id is already registered (idempotency guard).

The factory in `create-interactive-entity-demo.ts` additionally checks `ws.workspaceState.value.entities.get(id)` immediately after `canvasAdapter.createEntity()` — if the EventBus already pre-registered an instance, the factory returns that instance directly instead of spawning a second one.

---

## 3. Entity Rename Not Updating Link Labels

### File changed
- `src/core/create-link-finalizer.ts`

### Fix
The `onEntityChanged` subscription previously only listened for `LinkPropertiesUpdated | LinkCreated`. Added `EntityNameUpdated` as a third trigger so `linkLabelFOs.forEach(updateLinkLabel)` fires whenever any entity is renamed.

```ts
if (e.type === 'LinkPropertiesUpdated' || e.type === 'LinkCreated' || e.type === 'EntityNameUpdated') {
  linkLabelFOs.forEach((fo, id) => updateLinkLabel(id, fo));
}
```

---

## 4. SQL Export — Kebab-Case / Reserved Word Identifiers

### File changed
- `src/adapters/create-sql-adapter.ts`

### Fix
Added `q(identifier)` helper that wraps every SQL identifier in `[square brackets]` with `]]` escaping for embedded `]` characters:

```ts
const q = (identifier: string): string => `[${identifier.replace(/]/g, ']]')}]`;
```

Applied to: table names, column names, FK column names, FK constraint names, pivot table names.

Added `toTableName(entityName)` helper (PascalCase → snake_case) to avoid duplication.

---

## 5. Export Plugin System

### Architecture

```
src/features/export/
  export-plugin.types.ts          — ExportPlugin + CustomExportPlugin interfaces
  create-export-registry.ts       — Singleton Map: registerExportPlugin / getExportPlugins
                                    Custom plugin CRUD in localStorage (key: vbe2:export-custom-plugins)
                                    runCustomExportPlugin() — new Function() sandbox
  create-export-plugins-tab.ts    — Settings tab UI: built-in list + custom plugin editor
  create-canvas-snapshot.ts       — (pre-existing) SVG/PNG export
  plugins/
    sql-ddl.plugin.ts             — wraps createSqlAdapter
    prisma.plugin.ts              — wraps createPrismaAdapter
    typescript.plugin.ts          — wraps createTypescriptAdapter
    json-schema.plugin.ts         — refactored from inline toolbar code
    mermaid.plugin.ts             — NEW: erDiagram notation (paste into GitHub/Notion/etc.)
```

### ExportPlugin interface

```ts
interface ExportPlugin {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly fileExtension: string;
  readonly mimeType: string;
  readonly generate: (snapshot: SchemaGraphState) => string;
}
```

`snapshot` is `SchemaGraphState` — plain JSON: `{ entities: Record<id, Entity>, links: Record<id, LinkProps> }`.

### Where plugins are registered

`src/preview/create-canvas-page.ts` — top of module, before any function call:

```ts
registerExportPlugin(sqlDdlPlugin);
registerExportPlugin(prismaPlugin);
registerExportPlugin(typescriptPlugin);
registerExportPlugin(jsonSchemaPlugin);
registerExportPlugin(mermaidPlugin);
```

Adding a new plugin: create a file in `plugins/`, add one `registerExportPlugin(...)` line in `create-canvas-page.ts`.

### Toolbar changes

The 4 hardcoded export buttons (TS, SQL, JSON Schema, Prisma) were removed and replaced with a single **"Export Schema…" dropdown button** that builds its menu dynamically from `getExportPlugins()`. The dropdown appears above the toolbar, auto-closes on outside click.

SVG / PNG export buttons (visual snapshot, not schema) remain as separate toolbar buttons since they operate on the canvas DOM, not on the kernel snapshot.

### Settings tab changes

`SettingsPageProps` gained an optional `getKernel?: () => SchemaGraphKernel` field.

A new **"Export Plugins"** tab (6th tab) was added to the settings page (`create-settings-page.ts`). It shows:

- **Built-in plugins** — list with `.ext` badge, label, description, and an Export button that downloads immediately using the live kernel.
- **Custom plugins** — list with edit / export / delete per plugin, plus a "+ New Plugin" button that opens an inline editor.

The custom plugin editor stores a JS function body (`fnBody`). The function receives `snapshot` and must `return` a string. Compiled via `new Function('snapshot', fnBody)`. A warning banner is shown explaining the security implications of running arbitrary JS.

Settings open from `create-canvas-page.ts` now passes `getKernel` so the Exports tab can test-export the currently active schema.

---

## 6. What Was Already Done (prior sessions, for context)

- EventBus `publish()` made synchronous (publish-then-return, no stale closure batching)
- Reconcile initial trigger — runs once on page load without requiring a dispatch
- Rubber-band multi-select — SVG overlay, Tab/Shift+Tab isolation, `drop-shadow` feedback
- Demo entity removal on shape palette tools
- Kernel adapter contamination guard (kernel IDs never copied to DOM entity store)
- Duplicate link restoration on schema switch
- Wrong anchor edge — links now use the id that ends the drag, not the pre-drag origin

---

## Codebase Entry Points

| Task | File |
|---|---|
| Page bootstrap | `src/preview/create-canvas-page.ts` |
| Toolbar | `src/preview/create-canvas-toolbar.ts` |
| Settings page | `src/features/settings-page/create-settings-page.ts` |
| Export registry | `src/features/export/create-export-registry.ts` |
| Built-in plugins | `src/features/export/plugins/*.plugin.ts` |
| Validation rules | `src/core/validation/create-schema-validator.ts` |
| Redux store | `src/core/create-redux-store.ts` |
| Entity registry | `src/core/create-entity-registry.ts` |
| Link finalizer | `src/core/create-link-finalizer.ts` |
| SQL adapter | `src/adapters/create-sql-adapter.ts` |

## Build

```
cd packages/atomos-structura
pnpm tsc --noEmit   # type-check
pnpm vite           # dev server
```

TypeScript reports 0 errors on HEAD.
