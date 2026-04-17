# Atomos Structura

**Visual schema designer for TypeScript projects** — Build, edit, and export data-model schemas headlessly via API, through MCP tools for AI agents, or with a full interactive canvas UI.

## ✨ Key Features

- 🎯 **Headless API** — Programmatically create schemas without UI
- 🤖 **AI Agent Integration** — Full MCP server for Claude, GPT, Cursor
- 🎨 **Visual Canvas** — Interactive drag-and-drop schema builder  
- 🔗 **Rich Relationships** — 1:1, 1:*, *:*, self-referencing with cardinality
- 📱 **Multi-Schema Support** — Multiple diagrams in one workspace
- 🎛️ **Fine-Grained Control** — Menu system, viewport management, session lifecycle
- 💾 **Complete Persistence** — Save/load workspaces, localStorage integration
- 🔧 **Zero Dependencies** — Pure TypeScript, Web Components, TypeScript-first

## 🏗️ Project Structure

```
atomos-structura/
├── packages/
│   ├── atomos-structura/       # 🎨 Main visual schema builder
│   ├── atomos-structura-core/  # 📦 Core types, models, factories  
│   ├── atomos-structura-mcp/   # 🤖 MCP server for AI tools
│   ├── atomos-prime/           # 🧩 Reusable web components
│   └── atomos-prime-style/     # 🎨 Tailwind theme & design system
└── examples/                   # 📚 Usage examples
```

## 🚀 Quick Start

### Headless Schema Creation
```typescript
import { createSchemaBuilder } from '@atomos-web/structura';

const builder = createSchemaBuilder({ config: { headless: true } });

// Create entities programmatically
builder.addEntity({
  name: 'User',
  properties: [
    { name: 'id', dataType: 'UUID', nullable: false },
    { name: 'email', dataType: 'VARCHAR', nullable: false }
  ]
});

// Control viewport and layout
builder.api.centerOnScreen({ width: 1200, height: 800 });
builder.api.fitToScreen({ padding: 100 });
```

### AI Agent Integration (MCP)
```bash
# Start MCP server for AI tools
npx @atomos-web/structura-mcp

# AI agents can now:
# - Create/update entities and relationships  
# - Control viewport (zoom, pan, center, fit)
# - Manage sessions (close, clear memory)
# - Configure menu availability
```

### Visual Canvas
```bash
pnpm install
pnpm build
cd packages/atomos-structura
pnpm serve
```

## 📦 Packages

### @atomos-web/structura
**Main schema builder** with headless API + visual canvas. Create entities, relationships, manage multiple schemas, viewport control.

### @atomos-web/structura-core  
**Core types and factories** — Entity, Link, WorkspaceConfig, menu controls. Shared between all packages.

### @atomos-web/structura-mcp
**MCP server** providing 20+ tools for AI agents to manipulate schemas. HTTP + SSE real-time sync.

### @atomos-web/prime
**Web components library** — Reactive forms, dialogs, panels built with vanilla TypeScript + Web Components.

### @atomos-web/prime-style
**Design system** — Tailwind CSS theme with consistent colors, spacing, typography.

## 🏛️ Architecture

- **TypeScript-first**: Strict mode, zero `any` types
- **Functional constructors**: No classes, Object.defineProperty pattern
- **One item per file**: Clean, modular structure  
- **kebab-case naming**: Consistent throughout
- **Ultra-high standards**: 95% test coverage minimum

## 🔧 Core Models

- **BaseEntity**: Common properties (id, code, timestamps)
- **Entity**: Schema entities with properties rows and edges
- **Link**: Relationships between entities with cardinalities
- **Property**: Typed properties (string, number, boolean)
- **Anchor**: Connection points on entity edges
- **Edge**: Resize handlers and anchor hosts
- **Settings**: Tool configuration options

## 🚦 Commands

```bash
pnpm build        # Build all packages
pnpm dev          # Watch mode development
pnpm test         # Run all tests
pnpm lint         # Lint all packages
pnpm type-check   # TypeScript validation
pnpm clean        # Clean dist folders
```

## 📋 Development Guidelines

- Follow the system instructions in `system-instructions.md`
- Use functional constructors with proper `this` typing
- Maintain 95% test coverage
- Zero TypeScript errors policy
- Performance target: <=10% of solid-js bundle size