# @atomos-web/structura-mcp

Model Context Protocol (MCP) server for Atomos Structura schema designer.

---

## Technical Overview

`@atomos-web/structura-mcp` provides a standard Model Context Protocol (MCP) server interface that exposes Atomos Structura schema manipulation tools to autonomous AI agents (such as Claude, GPT-4, Cursor, and custom LLM tools).

Supports both JSON-RPC 2.0 over HTTP/stdio and Server-Sent Events (SSE) for real-time bidirectional synchronization with browser canvas clients.

---

## Installation

```bash
npm install @atomos-web/structura-mcp
# or
pnpm add @atomos-web/structura-mcp
```

---

## Quick Start

### 1. Launching via CLI

```bash
# Launch server on default port (3001)
npx @atomos-web/structura-mcp

# Custom port
PORT=3005 npx @atomos-web/structura-mcp
```

### 2. Embedding in Node.js Applications

```typescript
import { createServer } from 'http';
import { VbsMcpServer } from '@atomos-web/structura-mcp';

const mcp = new VbsMcpServer({
  initialConfig: {
    headless: true,
    allow_multiple_schemas: true
  }
});

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && req.url === '/events') {
    mcp.handleSSE(req, res);   // Real-time SSE stream
  } else {
    mcp.handleRequest(req, res); // JSON-RPC 2.0 endpoint
  }
}).listen(3001);
```

---

## MCP Tools Reference

### Operational Mode & Grouping Tools

| Tool | Parameters | Description |
|---|---|---|
| `structura_set_workspace_mode` | `mode: 1 \| 2 \| 3` | Switch operational mode (1: Single, 2: Multi, 3: Meta Canvas). |
| `structura_group_schema` | `groupColor?: string`, `depends_on?: string` | Group active schema into a reusable Meta Canvas entity. |

### Schema & Entity Manipulation

| Tool | Parameters | Description |
|---|---|---|
| `atomos-structura/create-entity` | `id`, `name`, `properties`, `position`, `dimensions` | Create a new entity in the active schema. |
| `atomos-structura/update-entity` | `id`, `name`, `properties`, `position`, `dimensions` | Update an existing entity definition. |
| `atomos-structura/delete-entity` | `entityId` | Delete an entity and remove associated links. |
| `atomos-structura/create-link` | `id`, `leftEntityId`, `rightEntityId`, `direction`, `leftCardinality`, `rightCardinality` | Create relationship link between entities. |

### Layout & Viewport Control

| Tool | Parameters | Description |
|---|---|---|
| `structura_auto_layout` | `layout_template?: 'sugiyama'` | Execute automated graph layout algorithm. |
| `structura_fit_to_screen` | — | Automatically fit canvas viewport to bounding box. |
| `structura_center_to_schema` | — | Center viewport on graph center of mass. |
| `structura_export_svg` | — | Render and return SVG presentation string. |

---

## Error Handling & Response Codes

| Error Code | HTTP Status | Description |
|---|---|---|
| `-32601` | 404 | Method not found |
| `403` | 403 | Operation blocked by workspace security or configuration policy |
| `404` | 404 | Target entity or schema not found |
| `500` | 500 | Server execution error |

---

## License

Licensed under AGPLv3. See [LICENSE](LICENSE) for details.
