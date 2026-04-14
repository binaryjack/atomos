# @atomos-web/structura-mcp

Node.js HTTP + SSE server that exposes the Atomos Structura schema designer over the [Model Context Protocol](https://modelcontextprotocol.io).  
Lets AI agents (Claude, GPT, Cursor, etc.) and CLI tools read and mutate schema workspaces in real time.

## Install

```bash
pnpm add @atomos-web/structura-mcp
# or
npm i @atomos-web/structura-mcp
```

## Run the server

```bash
# via package bin
npx vbs-mcp

# with custom port
PORT=3001 npx vbs-mcp
```

Or embed in your own Node.js server:

```ts
import { createServer } from 'http';
import { createVbsMcpServer } from '@atomos-web/structura-mcp';

const mcp = createVbsMcpServer({
  initialConfig: {
    allow_multiple_schemas: false,
  },
});

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && req.url === '/events') {
    mcp.handleSSE(req, res);   // SSE stream
  } else {
    mcp.handleRequest(req, res); // JSON-RPC style POST
  }
}).listen(3001);
```

---

## Transport

| Direction | Mechanism | Endpoint |
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
