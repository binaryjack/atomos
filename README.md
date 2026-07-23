# Atomos Structura

High-performance visual schema designer and vector presentation engine for TypeScript projects. Build, edit, and export data-model schemas headlessly via API, through Model Context Protocol (MCP) tools for autonomous AI agents, or with a full interactive multi-canvas workspace UI.

---

## Core Capabilities

- **Headless API**: Programmatically construct and manipulate schemas without mounting a browser DOM.
- **AI Agent Integration**: Full MCP server supporting Model Context Protocol for Claude, GPT, and Cursor.
- **Meta Canvas Architecture**: Multi-dimensional nested schema hierarchy with 3 operational modes (Single Canvas, Flat Multi-Canvas, and Hierarchical Meta Canvas).
- **Standalone SVG Presentation Engine**: High-fidelity vector rendering engine (`@atomos-web/renderer-svg`) supporting themes and 4 directional relationship modes.
- **Mermaid.js Adapter**: Bidirectional conversion between Mermaid flowchart DSL and Atomos Structura Schema Graphs.
- **Multi-Instance Isolation**: Complete workspace state separation via mandatory `instanceId` tracking.
- **Code Export Adapters**: Native code generators for SQL DDL, Prisma Schema, TypeScript Interfaces, JSON Schema, and Mermaid.js.

---

## Project Structure

```
atomos/
├── packages/
│   ├── atomos-structura/       # Main visual canvas builder & headless API
│   ├── atomos-structura-core/  # Core domain models, state reducers & types
│   ├── atomos-structura-mcp/   # Model Context Protocol (MCP) server
│   ├── atomos-renderer-svg/    # Standalone SVG vector presentation engine
│   ├── atomos-prime/           # Reactive Web Components library
│   ├── atomos-prime-style/     # Design system tokens and styling
│   ├── formular-dev/           # Dynamic form engine & input controls
│   └── showcase/               # Next.js interactive documentation application
```

---

## Workspace Operational Modes

Atomos Structura supports three distinct operational modes configurable per session or via MCP:

1. **Mode 1 (Single Canvas)**: Embedded application default configuration. Renders a single active schema without tab UI or group palette.
2. **Mode 2 (Multi-Canvas)**: Enables schema tabs for switching between multiple flat schema diagrams.
3. **Mode 3 (Meta Canvas)**: Full hierarchical multi-dimensional mode. Enables group palette sidebar, nested SVG snapshot rendering for group entities, and parent-child breadcrumb navigation.

---

## Quick Start

### 1. Headless Schema Construction

```typescript
import { createSchemaBuilder } from '@atomos-web/structura';

const builder = createSchemaBuilder({
  config: { headless: true },
  instanceId: 'workspace-instance-1'
});

// Add Entity
builder.addEntity({
  id: 'usr_01',
  name: 'User',
  position: { x: 100, y: 100 },
  dimensions: { width: 220, height: 140 },
  properties: [
    { key: 'id', label: 'ID', dataType: 'UUID' },
    { key: 'email', label: 'Email', dataType: 'VARCHAR(255)' }
  ]
});

// Add Relationship
builder.addRelationship({
  id: 'rel_01',
  leftEntityId: 'usr_01',
  rightEntityId: 'ord_01',
  direction: 'right',
  leftCardinality: '1',
  rightCardinality: '*'
});
```

### 2. Standalone Vector Presentation Mode

```typescript
import { renderToSVG } from '@atomos-web/renderer-svg';

const svgContent = renderToSVG(snapshot, {
  theme: 'sovereign-dark',
  padding: 30,
  responsive: true
});
```

### 3. AI Agent MCP Integration

```bash
# Launch MCP Server
npx @atomos-web/structura-mcp
```

AI agents connect via HTTP/SSE or stdio and execute tools such as:
- `structura_set_workspace_mode`
- `structura_group_schema`
- `structura_auto_layout`
- `structura_export_svg`

---

## Development

```bash
pnpm install
pnpm build        # Compile all workspace packages
pnpm dev          # Run dev mode
pnpm test         # Execute test suites
pnpm type-check   # Validate TypeScript types
```

---

## License

Licensed under AGPLv3. See [LICENSE](LICENSE) for details.
