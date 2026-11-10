# Workflow designer canvas (v6)

`createCanvasPage(instanceId, config?, mcpUrl?, onStateChange?)` returns the classic page handle
(`element`, `store`, `viewport`, `workspace`, `cleanup`) **plus** the `WorkflowCanvasApi` below.
ER diagrams (side anchors, properties, cardinalities) keep working unchanged.

## Typed ports and node types

```ts
import { createCanvasPage, type NodeTypeDefinition } from '@atomos-web/structura';

const canvas = createCanvasPage('flow-editor', { persistence: false });

const http: NodeTypeDefinition = {
  type: 'http',
  label: 'HTTP request',
  category: 'io',
  ports: config => [
    { id: 'in', direction: 'in', dataType: 'any' },
    { id: 'body', direction: 'out', dataType: 'json' },
    ...(config['withHeaders'] ? [{ id: 'headers', direction: 'out' as const, dataType: 'map' }] : []),
  ],
  configSchema: { type: 'object', properties: { url: { type: 'string' } } },
  render: ctx => Object.assign(document.createElement('div'), { textContent: `${ctx.label}: ${ctx.config['url'] ?? ''}` }),
};
canvas.nodeTypes.register(http);
const id = canvas.addNode({ type: 'http', position: { x: 80, y: 80 }, config: { url: 'https://example.com' } });
canvas.updateNodeConfig(id, { url: 'https://example.com', withHeaders: true }); // ports re-resolved
```

- `PortSpec { id; label?; direction: 'in' | 'out'; dataType; required?; multiple? }` (from `@atomos-web/structura-core`).
- Inputs render on the left, outputs on the right, evenly spaced; each handle has the DOM id `${nodeId}::${portId}`.
- Inputs accept one link unless `multiple: true`; outputs accept many unless `multiple: false`.
- `nodeType`, `config`, `metadata` and the resolved `ports` are persisted losslessly on the entity.
- Links between ports carry `sourcePortId` / `targetPortId` (and anchors `${nodeId}::${portId}`).

## Connection validation

Checks run **before** a link is created (drag-and-drop, `canvas.connect`, reconnect):
node exists, no self loop, out → in, no duplicate, `multiple` respected, data types assignable,
optional cycle prevention, optional topology rules, then the custom validator.

```ts
canvas.setConnectionOptions({
  isAssignable: (from, to) => from === to || to === 'any' || (from === 'int' && to === 'number'),
  preventCycles: true,
  topology: { rulesByNodeType: { trigger: { allowedSources: [], allowedTargets: '*' } } },
});
canvas.setConnectionValidator((source, target, graph) =>
  graph.edges.length < 200 ? { ok: true } : { ok: false, reason: 'Graph too large' });
canvas.on('connection:rejected', ({ source, target, reason }) => toast(reason));
```

While dragging from an output, compatible inputs are enlarged (`data-connectable="true"`) and
incompatible ones dimmed (`data-connectable="false"`, `data-reject-reason`).

## Runtime overlay (not in the document, not in undo)

```ts
canvas.overlay.setNodeState('n1', { status: 'running', label: 'step 2/5', progress: 0.4 });
canvas.overlay.setEdgeState('link-1', { active: true });
canvas.overlay.clear();
```

`status`: `idle | queued | running | succeeded | failed | skipped | waiting`; `progress` is clamped to [0, 1].
`<atomos-structura-viewer>` accepts the same fields: `viewer.patchEntity('n1', { status: 'failed', label: 'boom' })`.
Assigning `viewer.schema` rebuilds only when nodes/edges change; otherwise nodes are patched in place.

## Transactions and undo

`canvas.transaction(label, fn)` records every change made in `fn` as one undo step (nestable).
Auto-layout, DAG import, document import, paste, delete and config updates use it; a drag gesture
(including multi-selection drags) is one step; moving a node re-routes only its own links.

## Editing basics

Keyboard listeners live on the canvas host (`role="application"`, focusable), never on `document`:
Delete/Backspace, Ctrl/Cmd+C / V / A, Ctrl/Cmd+Z, Shift+Z / Y, Escape, `?` (shortcuts panel).
Nodes are focusable (`tabindex="0"`, `aria-label`). Shift+click toggles selection, Shift+drag on
the background rubber-band selects, dragging a selected node moves the whole selection.
API: `getSelection`, `setSelection`, `selectAll`, `clearSelection`, `deleteSelection`, `copySelection`, `paste`.

## Events

`canvas.on(event, handler)` returns an unsubscribe function.

| Event | Payload |
|---|---|
| `change` | `{ revision }` |
| `node:added` | `{ node: WorkflowDocumentNode }` |
| `node:removed` | `{ nodeId }` |
| `node:config-changed` | `{ nodeId, config, previous }` |
| `edge:added` | `{ edge: WorkflowDocumentEdge }` |
| `edge:removed` | `{ edgeId }` |
| `selection:changed` | `{ nodeIds }` |
| `connection:rejected` | `{ source: PortRef, target: PortRef, reason }` |

## Versioned documents

```ts
const doc = canvas.exportDocument(); // { schemaVersion: 2, nodes, edges, viewport }
const result = canvas.importDocument(jsonOrObject); // v1 workspace JSON is migrated
if (!result.ok) console.error(result.errors); // [{ path, code, message }] — nothing applied
```

Stand-alone helpers: `parseCanvasDocument`, `validateCanvasDocument`, `migrateV1Workspace`,
`restorePersistedState`. localStorage loads go through the same validation (a rejected state is kept
under `<key>:rejected-backup`). Disable persistence with `{ persistence: false }`.

## Auto-layout (ELK layered, 6.1)

`LayoutRegistry` strategies `layered` (canonical) and `sugiyama` (alias) run `runElkLayout(entityManager, settings?)`
(elkjs 0.9.3): port-aware (FIXED_ORDER, inputs WEST / outputs EAST), size-aware, hierarchical (expanded
groups lay out their children and grow to fit). Positions, container sizes and link routing are written in one
transaction; if the document changed while ELK was computing the result is discarded (`{ applied: false, reason: 'stale' }`).

## Groups / subflows (schemaVersion 3)

```ts
const g = canvas.createGroup(['a', 'b'], 'Payment'); // container of type 'group', children get parentId
canvas.addNode({ type: 'task', position: { x: 0, y: 0 }, parentId: g });
canvas.setGroupCollapsed(g, true);   // children unmounted, crossing edges drawn to proxy ports 'proxy-in.<child>.<port>'
canvas.setNodeParent('a', null);     // back to top level (cycles and non-group parents are rejected)
```

Dragging a group moves all descendants (hidden ones included) in one undo step. Documents are now
`schemaVersion: 3` (`parentId` on nodes; parents must exist, be groups and never form a cycle);
v2 documents are accepted and reported as `migratedFrom: 2`.

## Viewport culling

The editor mounts only nodes intersecting the viewport (+200 world units) and the edges / labels touching them;
the rest is detached and re-mounted on pan / zoom (`createDomCuller`, `mountViewportCulling`). It works inside the
shadow root and never queries `document`. Benchmark: 5,000 nodes / 6,000 edges keep < 100 nodes mounted.

## BPMN 2.0

`exportBpmn(doc): string` and `importBpmn(xml, parser?)` (returns the same validation result as `importDocument`).
Subset: `startEvent`, `endEvent`, `task`, `serviceTask`, `userTask`, `exclusiveGateway`, `parallelGateway`,
`sequenceFlow`, and `subProcess` ⇄ `group`. Diagram bounds (BPMNDI) carry positions and sizes; names are XML-escaped;
other node types export as `task`; flows crossing a subProcess boundary are written at process level.
`importBpmn` needs a DOMParser (browser) or an injected `XmlParser`.

## Collaboration (optional Yjs)

```ts
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
const ydoc = new Y.Doc();
const binding = createYjsBinding(canvas, ydoc, { awareness: new Awareness(ydoc), user: { name: 'Ada', color: '#f97316' } });
```

Nodes and edges live in `ydoc.getMap('structura.nodes' | 'structura.edges')`. Local changes are written in one Yjs
transaction; remote changes are validated and applied as one canvas transaction. Remote selections are drawn on the
overlay layer (`canvas.overlay.peersOn(nodeId)`). `yjs@13.6.20` and `y-protocols@1.0.6` are optional peer dependencies.

## MCP sync

atomos performs **no network I/O**. The host injects a supervised transport (Codernic Flow uses a
StateKernel saga with reconnect, exponential backoff and jitter):

```ts
interface McpTransport {
  connect(onEvent: (e: { type: string; data: string }) => void, onStatus: (s: McpStatus) => void): { dispose(): void };
  send(result: { reqId: string; result?: unknown; error?: string }): Promise<void>;
}
// McpStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
const canvas = createCanvasPage('flow-editor', config, hostTransport);
```

`createMcpSync(store, { transport?, events?, instanceId?, onNodeProgress?, onRemoteChange? })` returns
`{ events, status(), onStatus(listener), cleanup }`. Server events (SSE names): `change` (full snapshot:
entities and links are added, updated and removed in one undo step), `workspace`, `node-progress` (→ overlay),
`viewport-updated`, `canvas-appearance-updated`, `frontend-action-request` (answered with `transport.send`),
`structura_report_progress`. The toolbar shows the transport status. `createInMemoryMcpTransport()` is
provided for tests and in-process hosts. `createMcpClient({ transport, store })` replaces the URL-based client.

## Core CLI entry

`@atomos-web/structura-core` is browser-safe: the Node-only CLI (`executeStructuraCli`, `runCli`, uses `fs`)
moved to the `@atomos-web/structura-core/cli` entry, so `BUILD_TARGET=webview-iife` now builds
`dist/webview/index.iife.js` (exported as `@atomos-web/structura/webview/iife`).
