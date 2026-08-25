# @atomos-web/structura

High-performance visual schema builder and headless graph engine for TypeScript applications.

---

## Technical Overview

`@atomos-web/structura` provides a comprehensive schema engineering platform supporting both headless programmatic API operation and interactive Web Component visual canvas rendering. Built with pure TypeScript, Shadow DOM isolation, and a Redux state container with reactive signals.

---

## Core Features

- **Multi-Mode Workspace Architecture**:
  - **Mode 1 (Single Canvas)**: Optimized for embedded canvas integrations (Codernic default).
  - **Mode 2 (Multi-Canvas)**: Flat diagram tabs management.
  - **Mode 3 (Meta Canvas)**: Hierarchical nested schema grouping with SVG node prints and breadcrumb navigation.
- **Vector Presentation Engine Integration**: Embedded `@atomos-web/renderer-svg` for presentation mode export and theme rendering.
- **Mermaid.js Adapter**: Full support for `toMermaid` and `fromMermaid` conversions.
- **Real-Time Telemetry**: Sub-millisecond animation patching (`patchEntity`, `patchLink`) bypassing Redux for 60fps execution visualizations.
- **Multi-Instance Isolation**: Guaranteed DOM and Redux state isolation via mandatory `instanceId`.

---

## Installation

```bash
npm install @atomos-web/structura
# or
pnpm add @atomos-web/structura
```

---

## Usage

### 1. Programmatic Builder API

```typescript
import { createSchemaBuilder } from '@atomos-web/structura';

const builder = createSchemaBuilder({
  config: { headless: true },
  instanceId: 'tenant-workspace-1'
});

// Create Entity
builder.addEntity({
  id: 'ent_user',
  name: 'UserAccount',
  position: { x: 100, y: 100 },
  dimensions: { width: 220, height: 140 },
  properties: [
    { key: 'id', label: 'User ID', dataType: 'UUID' },
    { key: 'email', label: 'Email', dataType: 'VARCHAR' }
  ]
});

// Add Relationship
builder.addRelationship({
  id: 'rel_user_orders',
  leftEntityId: 'ent_user',
  rightEntityId: 'ent_order',
  direction: 'right',
  leftCardinality: '1',
  rightCardinality: '*'
});

// Export Code Artifacts
const sqlCode = builder.exportSQL();
const tsInterfaces = builder.exportTypeScript();
```

### 2. Interactive Canvas Mounting

```typescript
import { createCanvasPage } from '@atomos-web/structura';

const container = document.getElementById('structura-root')!;

// Mount visual canvas
const { element, cleanup, getState } = createCanvasPage('canvas-instance-01', {
  allow_multiple_schemas: true,
  readonly: false
});

container.appendChild(element);
```

### 3. Custom Web Component Usage

```html
<atomos-structura-viewer id="viewer"></atomos-structura-viewer>

<script type="module">
  import '@atomos-web/structura';

  const viewer = document.getElementById('viewer');
  viewer.schema = {
    entities: [ ... ],
    links: [ ... ]
  };
</script>
```

---

### 4. Neura 3D WebGL Neural Graph Engine

```typescript
import { createNeuraInstance, type NeuraNode, type NeuraEdge } from '@atomos-web/structura';

const canvas = document.getElementById('neura-canvas') as HTMLCanvasElement;

const neura = createNeuraInstance(canvas, {
  theme: 'cyber',
  labelsMode: 'focus-only', // 'focus-only' (hover/click only), 'auto', or 'always'
  physicsParams: {
    attractionForce: 0.03,
    appartenanceGravity: 0.05,
    repulsionForce: 0.02,
    restingDistance: 90,
    idealRadius: 180,
    zSpread: 0.85,
    globalGravity: 0.0003,
    alphaDecay: 0.98,
  },
  onNodeClick: (node) => console.log('Selected node:', node),
  onNodeHover: (node) => console.log('Hovered node:', node),
  onFPS: (fps) => console.log('Current FPS:', fps),
});

// Load nodes & edges into 3D physics worker
neura.loadGraph(nodes, edges);
neura.setAutoRotate(true, 0.18);

// Real-Time Telemetry & Synaptic Illumination
neura.setNodeActivity('slot-0', 0.85, 'routing');
neura.triggerEnergyBeam('slot-0', 'slot-1', '#38bdf8', 750);

// Empathic Voice / Cognitive Listening Feedback
neura.setCognitiveCharge(0.75, 0); // VAD user speech energy charge
neura.fireThinkingPulse('#f59e0b'); // Deliberation 3D shockwave
neura.releaseCognitiveCharge(1); // Release energy to active specialist slot
```

---

## API Reference

### `createSchemaBuilder(options)`

| Option | Type | Description |
|---|---|---|
| `instanceId` | `string` | **Required.** Unique identifier for multi-instance store isolation. |
| `config` | `WorkspaceConfig` | Runtime feature toggles and operational mode overrides. |
| `mcpUrl` | `string` | Optional URL of a running MCP server for real-time synchronization. |

### `createNeuraInstance(canvas, options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `theme` | `ShaderTheme` | `'cyber'` | WebGL shader theme (`'cyber'`, `'synthwave'`, `'matrix'`). |
| `labelsMode` | `'focus-only' \| 'auto' \| 'always'` | `'auto'` | Overlay label mode. `'focus-only'` displays 3D HTML labels strictly on hover/click. |
| `physicsParams` | `Partial<PhysicsParams>` | — | 3D Web Worker force-directed graph parameters. |
| `onNodeClick` | `(node: NeuraNode \| null) => void` | — | Callback fired when a node is clicked/selected. |
| `onNodeHover` | `(node: NeuraNode \| null) => void` | — | Callback fired when a node is hovered. |
| `onFPS` | `(fps: number) => void` | — | Real-time FPS telemetry callback. |

### Operational Mode Switch

```typescript
builder.store.dispatch({
  type: 'workspace-mode-set',
  mode: 3 // Mode 1: Single, Mode 2: Multi, Mode 3: Meta Canvas
});
```

---

## Code Export Plugins

`@atomos-web/structura` includes native export adapters:
- `sqlDdlPlugin`: Standard SQL DDL (`CREATE TABLE`)
- `prismaPlugin`: Prisma schema definitions (`model Entity { ... }`)
- `typescriptPlugin`: TypeScript interface definitions
- `jsonSchemaPlugin`: JSON Schema Draft 7 format
- `mermaidPlugin`: Mermaid.js flowchart DSL

---

## License

Licensed under AGPLv3. See [LICENSE](LICENSE) for details.
