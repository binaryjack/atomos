# @atomos-web/structura

Visual schema designer for TypeScript projects.  
Build, edit, and export data-model schemas — headlessly via API or with a full interactive canvas UI.

## Install

```bash
pnpm add @atomos-web/structura
# or
npm i @atomos-web/structura
```

> **Peer packages** — `@atomos-web/structura-core` is a direct dependency and installed automatically.

---

## Quick start — headless API

```ts
import { createSchemaBuilder } from '@atomos-web/structura';

const builder = createSchemaBuilder({
  config: { headless: true, allow_multiple_schemas: false },
});

// Add entities
builder.addEntity({
  id: 'user',
  name: 'User',
  properties: [
    { id: 'p1', name: 'id',    dataType: 'UUID',    nullable: false },
    { id: 'p2', name: 'email', dataType: 'VARCHAR', nullable: false },
  ],
});

// Save / restore
const json = builder.save();
const builder2 = createSchemaBuilder({ config: { headless: true } });
builder2.load(json);
```

---

## Quick start — canvas UI

```ts
import { createSchemaBuilder } from '@atomos-web/structura';

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
