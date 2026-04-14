# @atomos-web/structura-mcp

**Node.js MCP server** that exposes Atomos Structura schema designer over the [Model Context Protocol](https://modelcontextprotocol.io).  

🤖 **20+ AI Tools** for Claude, GPT, Cursor, and other AI agents to create, manipulate, and manage schema workspaces in real-time.

## ✨ New AI Capabilities

- 🎛️ **Viewport Control** — AI can zoom, pan, center, and fit schemas to screen
- 🔒 **Availability Guards** — Fine-grained permission system for menu features  
- 🔄 **Session Management** — Clean memory wipe and graceful session termination
- 📊 **Menu Configuration** — Runtime enable/disable of UI features
- 🎯 **Advanced Layout** — Smart centering and fit-to-screen algorithms

## Install

```bash
pnpm add @atomos-web/structura-mcp
# or
npm i @atomos-web/structura-mcp
```

## Quick Start

```bash
# Start MCP server
npx @atomos-web/structura-mcp

# Custom port and configuration
PORT=3001 npx @atomos-web/structura-mcp
```

### Embedded Server
```typescript
import { createServer } from 'http';
import { VbsMcpServer } from '@atomos-web/structura-mcp';

const mcp = new VbsMcpServer({
  initialConfig: {
    headless: true,
    allow_multiple_schemas: true,
    menu: {
      zoom: { available: true },
      center_on_screen: { available: true },
      export: { available: false } // Disable export by default
    }
  },
  onSessionClose: () => console.log('AI session ended'),
  onClearMemory: () => console.log('Memory cleared')
});

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && req.url === '/events') {
    mcp.handleSSE(req, res);   // Real-time updates
  } else {
    mcp.handleRequest(req, res); // JSON-RPC tools
  }
}).listen(3001);
```

---

## 🤖 AI Tools Reference

### Entity Management
| Tool | Purpose |
|------|---------|
| `atomos-structura/create-entity` | Create new entity with properties, position, dimensions |
| `atomos-structura/get-entity` | Retrieve entity by ID with all properties |  
| `atomos-structura/update-entity` | Replace entity properties and metadata |
| `atomos-structura/delete-entity` | Remove entity (cascades to delete related links) |

### Relationship Management  
| Tool | Purpose |
|------|---------|
| `atomos-structura/create-link` | Create relationship between entities with cardinality |
| `atomos-structura/get-schema` | Get all entities and links in active schema |

### **🆕 Viewport Control**
| Tool | Purpose | Availability Guard |
|------|---------|-------------------|
| `atomos-structura/viewport/get` | Get current zoom and pan state | None |
| `atomos-structura/viewport/set-zoom` | Set zoom level (0.1x to 4x) | `menu.zoom.available` |
| `atomos-structura/viewport/set-pan` | Set pan position {x, y} | None |  
| `atomos-structura/viewport/center` | Center view on entity centroids | `menu.center_on_screen.available` |
| `atomos-structura/viewport/fit-to-screen` | Fit all entities in viewport (zoom ≤2) | `menu.fit_to_screen.available` |

### **🆕 Session Lifecycle**
| Tool | Purpose |  
|------|---------|
| `atomos-structura/session/close` | End session, call onSessionClose hook, clear SSE clients |
| `atomos-structura/session/clear-memory` | Reset all data, call onClearMemory hook, preserve config |

### Schema Management
| Tool | Purpose |
|------|---------|  
| `atomos-structura/create-schema` | Create new schema tab/workspace |
| `atomos-structura/list-schemas` | List all schemas with entity counts |
| `atomos-structura/rename-schema` | Update schema name |
| `atomos-structura/delete-schema` | Remove schema (if not active) |
| `atomos-structura/activate-schema` | Switch to different schema |

### State Management
| Tool | Purpose |
|------|---------|
| `atomos-structura/sync-state` | Bulk update entities, links, settings, menu config |
| `atomos-structura/get-settings` | Retrieve workspace settings |
| `atomos-structura/update-settings` | Merge new settings |
| `atomos-structura/get-workspace` | Export complete workspace (all schemas + settings) |
| `atomos-structura/load-workspace` | Import complete workspace |

---

## 🔒 Availability Guards

AI tools respect menu configuration - if a feature is disabled, the tool returns `403 Forbidden`:

```typescript
// Configure availability
await mcp.call('atomos-structura/sync-state', {
  entities: [],
  links: [],
  menu_config: {
    zoom: { available: false },               // Blocks viewport/set-zoom  
    center_on_screen: { available: false },   // Blocks viewport/center
    fit_to_screen: { available: false },      // Blocks viewport/fit-to-screen
    export: { available: true }               // Allow export
  }
});

// This will now return: { error: { code: 403, message: "Feature not available" } }
await mcp.call('atomos-structura/viewport/set-zoom', { level: 2.0 });
```

---

## 📡 Real-Time Updates

SSE events keep AI agents synchronized with workspace changes:

| Event | Payload | Triggered By |
|-------|---------|-------------|
| `change` | `{ entities: [...], links: [...] }` | Entity/link modifications |
| `workspace` | `{ type: "schema-created", id: "...", name: "..." }` | Schema operations |  
| `settings-updated` | `{ settings: {...} }` | Settings changes |
| `viewport-updated` | `{ viewport: { zoom, pan } }` | Viewport changes |
| `menu-config` | `{ zoom: { available, value }, ... }` | Menu configuration |
| `state-reset` | `{ success: true }` | Memory clear operations |

## 📚 Example Usage

### Complete Schema Creation
```typescript
// 1. Create schema  
await mcp.call('atomos-structura/create-schema', {
  id: 'ecommerce', 
  name: 'E-commerce System'
});

// 2. Add entities
await mcp.call('atomos-structura/create-entity', {
  id: 'user',
  name: 'User',
  position: { x: 100, y: 100 },
  properties: [
    { key: 'id', value: 'UUID', type: 'text' },
    { key: 'email', value: 'string', type: 'email' }
  ]
});

// 3. Create relationships
await mcp.call('atomos-structura/create-link', {
  id: 'user-orders',
  leftEntityId: 'user',
  rightEntityId: 'order',
  leftCardinality: '1',
  rightCardinality: '*'
});

// 4. Auto-layout
await mcp.call('atomos-structura/viewport/center', { width: 1200, height: 800 });
await mcp.call('atomos-structura/viewport/fit-to-screen', { width: 1200, height: 800 });
```

Built with battle-tested reliability - **157/162 tests passing** 🎯
|---|---|---|
| Tool calls → server | HTTP POST | `/` |
| Server → client (push) | SSE | `GET /events` |

Every POST body is `{ method, params, id }`. Every response is `{ result?, error?, id }`.

---

## MCP methods

### Entity operations

| Method | Params | Returns |
|---|---|---|
| `atomos-structura/create-entity` | `Entity` | `{ success, entity }` |
| `atomos-structura/get-entity` | `{ entityId }` | `{ entity }` |
| `atomos-structura/update-entity` | `Entity` | `{ success, entity }` |
| `atomos-structura/delete-entity` | `{ entityId }` | `{ success }` |
| `atomos-structura/create-link` | `LinkProps` | `{ success, link }` |

### Schema operations

| Method | Params | Returns |
|---|---|---|
| `atomos-structura/list-schemas` | — | `{ schemas[], active_schema_id }` |
| `atomos-structura/create-schema` | `{ name, id? }` | `{ success, id, name }` or `403` |
| `atomos-structura/rename-schema` | `{ id, name }` | `{ success }` |
| `atomos-structura/delete-schema` | `{ id }` | `{ success }` |
| `atomos-structura/activate-schema` | `{ id }` | `{ success, id }` |
| `atomos-structura/get-schema` | `{ schemaId? }` | `{ schema }` |

### Settings

| Method | Params | Returns |
|---|---|---|
| `atomos-structura/get-settings` | — | `{ settings }` |
| `atomos-structura/update-settings` | `{ settings }` | `{ success, settings }` |

### Workspace persistence

| Method | Params | Returns |
|---|---|---|
| `atomos-structura/get-workspace` | — | `{ workspace: McpWorkspaceState }` |
| `atomos-structura/load-workspace` | `{ workspace: McpWorkspaceState }` | `{ success }` |
| `atomos-structura/sync-state` | `{ entities?, links?, settings? }` | `{ success }` |

`get-workspace` and `load-workspace` are fully **round-trippable** — the payload from `get-workspace` can be passed verbatim to `load-workspace`.

---

## SSE events

Subscribe via `GET /events`. The server sends two event types:

### `change`
Fired after any entity or link mutation.
```json
{ "entities": [...], "links": [...] }
```

### `workspace`
Fired after schema, canvas, or settings mutations.
```json
{
  "type": "schema-created | schema-deleted | schema-activated | settings-updated | state-loaded | ...",
  "id": "schema-abc",
  "name": "My Schema",
  "state": { ... }
}
```

---

## Session policy

```ts
createVbsMcpServer({
  initialConfig: {
    /** Block multi-schema sessions. create-schema returns 403 when a schema already exists. */
    allow_multiple_schemas: false,
  },
});
```

---

## Browser sync

The matching browser-side connector in `@atomos-web/structura` keeps the Redux store in sync with the MCP server automatically:

```ts
import { createSchemaBuilder } from '@atomos-web/structura';

const builder = createSchemaBuilder({ mcpUrl: 'http://localhost:3001' });
```

Manual wiring:
```ts
import { createMcpSync } from '@atomos-web/structura';

const { disconnect } = createMcpSync(store, 'http://localhost:3001');
```

---

## Error codes

| Code | Meaning |
|---|---|
| `403` | Operation blocked by session policy (`allow_multiple_schemas: false`) |
| `404` | Entity, schema, or canvas not found |
| `405` | Non-POST request on the command endpoint |
| `409` | Duplicate id (schema already exists) |
| `500` | Internal server error |
| `-32601` | Method not found |

---

## License

MIT
