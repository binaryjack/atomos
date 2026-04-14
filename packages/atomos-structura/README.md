# @atomos-web/structura

**Visual schema designer for TypeScript projects** — Build, edit, and export data-model schemas headlessly via API or with a full interactive canvas UI.

## ✨ New Features

- 🎛️ **Fine-Grained Menu Control** — Runtime enable/disable of zoom, center, export, etc.
- 🖼️ **Advanced Viewport API** — Programmatic zoom, pan, center-on-screen, fit-to-screen
- 🔄 **Session Lifecycle** — Clean memory wipe, graceful session termination
- 🤖 **Enhanced MCP Integration** — 20+ tools for AI agents with availability guards
- 📊 **Multi-Schema Workspaces** — Create and switch between multiple diagrams

## Install

```bash
pnpm add @atomos-web/structura
# or
npm i @atomos-web/structura
```

> **Peer packages** — `@atomos-web/structura-core` is installed automatically.

---

## 🎯 Headless API — Complete Control

### Basic Schema Creation
```typescript
import { createSchemaBuilder } from '@atomos-web/structura';

const builder = createSchemaBuilder({
  config: { 
    headless: true,
    allow_multiple_schemas: true,
    menu: {
      zoom: { available: true, value: 1.0 },
      center_on_screen: { available: true },
      fit_to_screen: { available: true },
      export: { available: true }
    }
  }
});

// Create entities with rich properties
builder.addEntity({
  id: 'user',
  name: 'User', 
  properties: [
    { name: 'id', dataType: 'UUID', nullable: false },
    { name: 'email', dataType: 'VARCHAR(255)', nullable: false },
    { name: 'created_at', dataType: 'TIMESTAMP', nullable: false }
  ],
  position: { x: 100, y: 50 },
  dimensions: { width: 140, height: 100 }
});

// Create relationships  
builder.addRelationship({
  leftEntityId: 'user',
  rightEntityId: 'order', 
  leftCardinality: '1',
  rightCardinality: '*',
  renderType: 'bezier'
});
```

### Advanced Viewport Control
```typescript
// Get current viewport state
const viewport = builder.api.getViewport();
console.log(viewport); // { zoom: 1, pan: { x: 0, y: 0 } }

// Programmatic zoom (clamped 0.1x to 4x)
builder.api.setZoom(2.5);

// Manual positioning
builder.api.setViewport({ zoom: 1.5, pan: { x: 100, y: 50 } });

// Smart auto-layout
builder.api.centerOnScreen({ width: 1200, height: 800 });
builder.api.fitToScreen({ width: 1200, height: 800, padding: 100 });
```

### Menu Control System
```typescript
// Runtime menu configuration
builder.menuControl.setAvailable('zoom_in', false);  // Disable zoom in
builder.menuControl.setAvailable('export', true);    // Enable export
builder.menuControl.setValue('zoom', 1.5);           // Set zoom value

// Subscribe to menu changes
builder.menuControl.subscribe((config) => {
  console.log('Menu updated:', config.zoom?.available);
});
```

### Session Lifecycle
```typescript
// Clear all data while preserving config
builder.clearMemory(); // Wipes entities + localStorage

// Graceful shutdown
builder.close(); // Stops subscribers + cleans up
```

### Multi-Schema Support
```typescript
// Create additional schemas
const schemaId = builder.api.createSchema('E-commerce');
builder.api.activateSchema(schemaId);

// List all schemas
const schemas = builder.api.listSchemas();
schemas.forEach(s => console.log(`${s.name}: ${s.entityCount} entities`));
```

---

## 🎨 Canvas UI — Visual Editor

```typescript
import { createSchemaBuilder } from '@atomos-web/structura';

// Full visual interface with drag-and-drop
const builder = createSchemaBuilder();
const container = document.getElementById('canvas')!;

// Mount the full interactive canvas into the DOM
const unmount = builder.mountUI(container);

// Later — tear down
unmount();
```

---

## API reference

### `createSchemaBuilder(props?)`

| Prop | Type | Default | Description |
|---|---|---|---|
| `config` | `WorkspaceConfig` | `{}` | Session-level policy flags |
| `mcpUrl` | `string` | — | Connect to a running `@atomos-web/structura-mcp` server |
| `onStateChange` | `(store) => void` | — | Called on every Redux state change |

Returns a `SchemaBuilder` instance.

---

### `SchemaBuilder`

```ts
interface SchemaBuilder {
  // Low-level access
  readonly store: ReduxStore;
  readonly workspaceApi: WorkspaceApi;
  readonly kernel: SchemaGraphKernel;

  // Entity mutations (dispatched to the active schema)
  addEntity(entity: Entity): void;
  removeEntity(entityId: string): void;
  updateEntity(entity: Entity): void;

  // Schema management
  createSchema(name: string): string;   // returns new schema id
  deleteSchema(id: string): void;

  // Persistence
  save(): string;             // returns JSON string
  load(json: string): void;   // restores from JSON

  // UI
  mountUI(container: HTMLElement): () => void;  // returns unmount fn
}
```

---

### `WorkspaceConfig`

```ts
interface WorkspaceConfig {
  /** Hide all settings panels. The settings-toggled Redux action becomes a no-op. */
  headless?: boolean;

  /**
   * When false, createSchema() throws and the MCP create-schema command returns 403.
   * Use for single-model sessions where schema sprawl is undesirable.
   */
  allow_multiple_schemas?: boolean;
}
```

---

### MCP sync

Connect a browser-side builder to a running `@atomos-web/structura-mcp` server:

```ts
import { createSchemaBuilder, createMcpSync } from '@atomos-web/structura';

const builder = createSchemaBuilder({ mcpUrl: 'http://localhost:3001' });

// Or wire manually
const { disconnect } = createMcpSync(builder.store, 'http://localhost:3001');
// disconnect() when done
```

State flows: browser Redux → POST `/` (`sync-state`) → MCP server.  
SSE events flow back: `GET /events` → Redux dispatch in the browser.

---

### Adapters

Generate code from the active schema:

```ts
import { createSqlAdapter, createTypescriptAdapter, createPrismaAdapter } from '@atomos-web/structura';

const sql  = createSqlAdapter(builder.kernel);
const ts   = createTypescriptAdapter(builder.kernel);
const prisma = createPrismaAdapter(builder.kernel);

console.log(sql.generate());       // CREATE TABLE ...
console.log(ts.generate());        // export interface User { ... }
console.log(prisma.generate());    // model User { ... }
```

---

### Redux store (advanced)

```ts
import { getGlobalReduxStore, resetGlobalReduxStore, create_redux_store } from '@atomos-web/structura';

// Singleton store (used by createCanvasPage)
const store = getGlobalReduxStore({ headless: true });

// Independent store per instance (used by createSchemaBuilder)
const isolated = create_redux_store({ allow_multiple_schemas: false });

// Reset singleton (useful in tests)
resetGlobalReduxStore();
```

---

## License

MIT
