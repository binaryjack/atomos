// We import the Web Components directly from Prime so they execute customElements.define
import '@atomos/prime';

// We import the headless kernel from us
import { createSchemaGraphKernel } from './core/create-schema-graph-kernel.js';
import { createCanvasAdapter } from './adapters/create-canvas-adapter.js';

// 1. Get the DOM container
const canvas = document.getElementById('schemaCanvas') as HTMLElement;

// 2. Initialize our Universal AST / Headless Engine
const kernel = createSchemaGraphKernel();

// 3. Connect them via the Adapter (which starts the uni-directional flow)
const canvasAdapter = createCanvasAdapter(kernel, canvas);

// 4. Seed the engine with some entities (Notice we don't touch the DOM directly)
kernel.addEntity({
    id: 'user-entity',
    name: 'User',
    properties: [],
    position: { x: 50, y: 50 },
    dimensions: { width: 150, height: 100 },
    edges: [],
    code: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
});

kernel.addEntity({
    id: 'org-entity',
    name: 'Organization',
    properties: [],
    position: { x: 300, y: 150 },
    dimensions: { width: 150, height: 100 },
    edges: [],
    code: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
});

kernel.addEntity({
    id: 'post-entity',
    name: 'Post',
    properties: [],
    position: { x: 50, y: 300 },
    dimensions: { width: 150, height: 100 },
    edges: [],
    code: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
});

// Optionally log changes for testing
kernel.subscribe(() => {
    console.log('Kernel State Snapshot:', kernel.getSnapshot().entities);
});
