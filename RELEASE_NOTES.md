# Release Notes

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Fixed

- **[CRITICAL] LocalStorage State Collision in Shared Origins** — When multiple Structura instances run in the same browser origin (e.g., multiple VS Code webview panels in a single extension), they were colliding in localStorage due to hardcoded keys. Fixed by:
  - Updating `create-redux-store.ts` to use `${instanceId}:vbe2:redux-state` instead of hardcoded `vbe2:redux-state`
  - Updating `create-persistence.ts` to accept `instanceId` and namespace the canvas viewport key
  - Updating `toolbox-config-manager.ts` to accept `instanceId` and namespace all 4 config keys (`atomos_toolbox_config`, `atomos_custom_shapes`, `atomos_general_settings`, `atomos_appearance_settings`)
  - Updating `create-export-registry.ts` to accept `instanceId` and namespace the custom plugins key
  - Ensuring `schema-builder.close()` only clears keys belonging to its own instance (now filters by `${instanceId}:vbe2:*` prefix)
  - Threading `instanceId` parameter through `createCanvasPage()` and all dependent initialization functions
  - **Breaking Change**: Functions now require `instanceId` parameter. If omitted, a random UUID is auto-generated.
  - See [Bug Report: LocalStorage State Collision](#multi-instance-isolation-bug-details) below.

### Added

- **`schema-create-auto` intent action** — The schema tab bar now dispatches a lightweight `schema-create-auto` action instead of generating an ID and firing `schema-created` directly. In standalone mode the Redux reducer handles it. When an MCP server URL is configured the canvas page intercepts the action via a dispatch hook, forwards the request to the MCP server, and the SSE `schema-created` event closes the loop. This eliminates duplicate ID generation between the UI and the server. ([`create-schema-tabs.ts`](packages/atomos-structura/src/preview/create-schema-tabs.ts), [`create-redux-store.ts`](packages/atomos-structura/src/core/create-redux-store.ts), [`create-canvas-page.ts`](packages/atomos-structura/src/preview/create-canvas-page.ts))

- **`addDispatchHook` on `ReduxStore`** — A lightweight middleware hook that lets consumers intercept Redux actions before they reach the reducer. Returning `null` from a hook swallows the action; returning the action (or a replacement) forwards it. Used internally to route `schema-create-auto` to MCP. ([`redux-state.types.ts`](packages/atomos-structura/src/types/redux-state.types.ts), [`create-redux-store.ts`](packages/atomos-structura/src/core/create-redux-store.ts))

- **Canvas adapter registry** — `getCanvasAdapterFor(schemaId)` replaces the global singleton canvas adapter. Each schema ID maps to its own `CanvasAdapter` instance, preventing cross-schema state pollution when multiple panels are open simultaneously. The old `getCanvasAdapter()` is kept as deprecated. ([`canvas-adapter.ts`](packages/atomos-structura/src/core/adapters/canvas-adapter.ts))

- **Explicit `schema_id` in MCP entity/link tools** — `create-entity`, `update-entity`, `delete-entity`, `create-link` now require a `schema_id` parameter and return `400` when it is absent or `404` when the schema is not found. `get-entity` falls back to the active schema for backwards compatibility. The `change` SSE event payload now includes `schema_id`. ([`mcp-server.ts`](packages/atomos-structura-mcp/src/mcp-server.ts))

- **Template injection tokens** — `webview/template.html` now ships with `${mcpUrl}` and `${schemaId}` tokens instead of a commented-out placeholder. Consuming extensions call `.replaceAll('${mcpUrl}', url)` and `.replaceAll('${schemaId}', id)` inside `buildHtml`. Empty strings are treated as `undefined` by the webview init, preserving standalone-mode behaviour. ([`template.html`](packages/atomos-structura/webview/template.html), [`webview/index.ts`](packages/atomos-structura/src/webview/index.ts))

- **Single-file IIFE build** — `pnpm run build:webview-iife` (env `BUILD_TARGET=webview-iife`) produces `dist/webview/index.iife.js` — a self-contained bundle with no dynamic imports and the global name `StructuraWebview`. Recommended for VSIX-packaged extensions where ES module dynamic imports are unreliable. ([`vite.config.ts`](packages/atomos-structura/vite.config.ts), [`package.json`](packages/atomos-structura/package.json))

- **`__APP_VERSION__` build constant** — `vite.config.ts` injects `__APP_VERSION__` from `package.json` at build time. Used by the new About modal. ([`vite.config.ts`](packages/atomos-structura/vite.config.ts))

- **About modal** — New `createAboutModal()` utility renders the package name, version (from `__APP_VERSION__`), MIT licence notice, and links to documentation and the repository. Accessible via the toolbar burger menu ("About" button with info icon). ([`create-about-modal.ts`](packages/atomos-structura/src/features/modal/create-about-modal.ts), [`create-canvas-toolbar.ts`](packages/atomos-structura/src/preview/create-canvas-toolbar.ts))

- **`--atp-modal-padding` CSS custom property** — The `atp-modal` shadow DOM `.dialog` now accepts `--atp-modal-padding` (default `0 4px`) so consuming applications can adjust internal padding without replacing the entire style. ([`atp-modal.style.ts`](packages/atomos-prime/src/features/modal/atp-modal/style/atp-modal.style.ts))

### Changed

- **`create-mcp-sync.ts`** — `applyChange` now reads `schema_id` from the SSE payload and applies the update to that specific schema rather than always targeting the active schema. ([`create-mcp-sync.ts`](packages/atomos-structura/src/features/mcp-sync/create-mcp-sync.ts))

- **Entity settings modal button style** — Removed hardcoded `height: 24px; min-height: 24px` override on `addPropBtn`; size is now determined by padding alone, matching other toolbar buttons. ([`create-entity-settings-modal.ts`](packages/atomos-structura/src/features/modal/create-entity-settings-modal.ts))

### Documentation

- **`EXTENSION_GUIDE.md`** — Updated `buildHtml` sample to use token replacements; added "Instance Isolation" and "Single-bundle IIFE" sections. ([`EXTENSION_GUIDE.md`](packages/atomos-structura/EXTENSION_GUIDE.md))

- **`structura-mcp/README.md`** — Added "Targeting a specific schema" section with `schema_id` usage examples and SSE routing pattern. ([`README.md`](packages/atomos-structura-mcp/README.md))

- **`docs/IMPLEMENTATION_STATUS.md`** — Added architectural change note block documenting the v1.2.0 isolation improvements. ([`IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md))

---

## [1.1.5] — 2026-04-14

- Initial production release of `@atomos-web/structura`, `@atomos-web/structura-core`, `@atomos-web/structura-mcp`.
- 20+ MCP tools for AI-driven schema creation.
- Viewport control, session lifecycle, availability guards, menu configuration.
- Export/import (JSON workspace, SVG, PNG).
- Redux undo/redo with history skip for volatile actions.
- `@atomos-web/prime` web component library: `atp-modal`, `atp-dropdown`, design system tokens.

---

## Multi-Instance Isolation Bug Details

### Root Cause Analysis

Structura relied on hardcoded localStorage keys for persistence. When multiple instances run in the same browser origin, **all instances share the exact same localStorage environment**, causing a singleton-like bug where canvases overwrite each other's state.

**Affected Storage Keys:**

| File | Keys | Status |
|------|------|--------|
| `create-redux-store.ts` | `vbe2:redux-state` | ✅ Fixed v1.2.2 |
| `create-persistence.ts` | `vbs-canvas-state` | ✅ Fixed v1.2.2 |
| `toolbox-config-manager.ts` | `atomos_toolbox_config`, `atomos_custom_shapes`, `atomos_general_settings`, `atomos_appearance_settings` | ✅ Fixed v1.2.2 |
| `create-export-registry.ts` | `vbe2:custom-export-plugins` | ✅ Fixed v1.2.2 |
| `schema-builder.ts` | `close()` method clears all `vbe2:*` keys | ✅ Fixed v1.2.2 |

### Scenario (Before Fix)

```typescript
// Webview Panel 1 opens "Schema A"
const app1 = await initializeStructuraWebview({
  containerId: 'app1',
  instanceId: 'panel-1'  // REQUIRED in v1.2.2+
});

// Webview Panel 2 opens "Schema B" — same origin
const app2 = await initializeStructuraWebview({
  containerId: 'app2',
  instanceId: 'panel-2'  // REQUIRED in v1.2.2+
});

// BEFORE FIX: Both stored state in same keys
// localStorage['vbe2:redux-state'] → continuously overwritten
// localStorage['vbs-canvas-state'] → continuously overwritten
// localStorage['atomos_toolbox_config'] → shared settings

// AFTER FIX: Fully namespaced
// localStorage['panel-1:vbe2:redux-state']
// localStorage['panel-2:vbe2:redux-state']
// localStorage['panel-1:vbs-canvas-state']
// localStorage['panel-2:vbs-canvas-state']
// localStorage['panel-1:atomos_toolbox_config']
// localStorage['panel-2:atomos_toolbox_config']
```

### Implementation Pattern

All persistence layers now follow this pattern:

```typescript
// Before
const STORAGE_KEY = 'some-key';
localStorage.setItem(STORAGE_KEY, value);

// After
export const someFunction = function(config: SomeConfig, instanceId?: string) {
  const STORAGE_KEY = `${instanceId}:some-key`;
  localStorage.setItem(STORAGE_KEY, value);
}
```

### Migration Guide for Consumers

**If you're using the headless API:**

```typescript
// v1.2.1 and earlier (no isolation)
const builder = createSchemaBuilder();

// v1.2.2+ (full isolation)
const builder = createSchemaBuilder({
  instanceId: 'my-app-instance-1'  // REQUIRED for multi-instance safety
});
```

**If you're embedding in VS Code extensions:**

```typescript
// Ensure you pass instanceId to initializeStructuraWebview
const app = await initializeStructuraWebview({
  containerId: 'app',
  instanceId: 'schema-editor-1',  // Unique per panel
  mcpServerUrl: '...'
});
```

**If instanceId is not provided:**

Structura auto-generates one (`instance-${randomId}-${timestamp}`), but this is **not recommended for production**. Always provide explicit `instanceId` for:
- Deterministic behavior in tests
- Predictable localStorage key structure
- Debugging multi-instance issues
