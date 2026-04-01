import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';

/**
 * createCanvasAdapter bounds the headless SchemaGraphKernel to a W3C Web Component 
 * instance of \`<atp-schema-canvas>\`.
 * It provides strict uni-directional data flow:
 * 1. Kernel Changes -> DOM Sync (Create, Update, Delete \`<atp-schema-node>\`)
 * 2. DOM Drag Events -> Kernel Mutations (\`updateEntity\`)
 */
export const createCanvasAdapter = (kernel: SchemaGraphKernel, canvasElement: HTMLElement) => {
    // Keep track of our rendered Web Components natively
    const renderedNodes = new Map<string, any>(); // Typed 'any' natively or use specific component typing if imported

    // 1. Core Subscribe loop (The single source of truth dispatcher)
    const unsubscribe = kernel.subscribe(() => {
        const { entities } = kernel.getSnapshot();

        // Pass 1: Sync Entities (Upsert logic)
        for (const [id, entity] of Object.entries(entities)) {
            let node = renderedNodes.get(id);
            
            // Instantiation
            if (!node) {
                node = document.createElement('atp-schema-node');
                node.dataId = id;
                node.label = entity.name;
                
                canvasElement.appendChild(node);
                renderedNodes.set(id, node);
            }
            
            // Diff & Update properties explicitly via Component Setters
            // (Bypasses innerHTML and React re-renders)
            if (node.x !== entity.position.x) node.x = entity.position.x;
            if (node.y !== entity.position.y) node.y = entity.position.y;
            if (node.label !== entity.name) node.label = entity.name;
        }

        // Pass 2: Garbage Collection (Remove deleted entities)
        for (const [id, node] of renderedNodes.entries()) {
            if (!entities[id]) {
                canvasElement.removeChild(node);
                renderedNodes.delete(id);
            }
        }
        
        // Edge syncing logic will sit here next...
    });

    // 2. Headless Mutation Listener - Catch Web Component events bubbling up
    const handleNodeMove = (e: Event) => {
        // Assert as CustomEvent to read details
        const ce = e as CustomEvent<{ id: string, x: number, y: number }>;
        const { id, x, y } = ce.detail;
        
        // Push State changes to the Kernel, DO NOT mutate the DOM intentionally
        kernel.updateEntity(id, { position: { x, y } });
        // After this triggers, the subscribe() loop fires, and correctly aligns state.
    };

    // Apply the Event Listener to the host element
    canvasElement.addEventListener('atp-node-move', handleNodeMove);

    // Initial explicit DOM bootstrap mapping
    // We get the current snapshot and manually dispatch an update to seed initial shapes
    const initialConfig = kernel.getSnapshot();
    if (Object.keys(initialConfig.entities).length > 0) {
        // We trigger the sync manually once, by simulating a dispatch
        const { entities } = initialConfig;
        
        for (const [id, entity] of Object.entries(entities)) {
            let node = document.createElement('atp-schema-node') as any;
            node.dataId = id;
            node.label = entity.name;
            node.x = entity.position.x;
            node.y = entity.position.y;
            canvasElement.appendChild(node);
            renderedNodes.set(id, node);
        }
    }

    // Teardown API for cleanup frameworks
    return Object.freeze({
        destroy: () => {
            unsubscribe();
            canvasElement.removeEventListener('atp-node-move', handleNodeMove);
            
            for (const node of renderedNodes.values()) {
                if (canvasElement.contains(node)) {
                    canvasElement.removeChild(node);
                }
            }
            renderedNodes.clear();
        }
    });
};
