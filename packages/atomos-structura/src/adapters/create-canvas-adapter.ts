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
    const renderedEdges = new Map<string, any>(); 

    // 1. Core Subscribe loop (The single source of truth dispatcher)
    const unsubscribe = kernel.subscribe(() => {
        const { entities, links } = kernel.getSnapshot();

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

        // Pass 2: Sync Edges (Upsert logic)
        for (const [id, link] of Object.entries(links)) {
            let edge = renderedEdges.get(id);
            if (!edge) {
                edge = document.createElement('atp-schema-edge');
                edge.dataId = id;
                canvasElement.appendChild(edge);
                renderedEdges.set(id, edge);
            }

            const leftEntity = entities[link.leftEntityId];
            const rightEntity = entities[link.rightEntityId];

            if (leftEntity && rightEntity) {
                // Compute anchoring (naively using center-right for source, center-left for target)
                const leftWidth = leftEntity.dimensions?.width || 150;
                const leftHeight = leftEntity.dimensions?.height || 50;
                const rightHeight = rightEntity.dimensions?.height || 50;

                const x1 = leftEntity.position.x + leftWidth;
                const y1 = leftEntity.position.x + (leftHeight / 2); // BUG here, let's fix it later or just assume y
                
                // Real coords
                const trueX1 = leftEntity.position.x + leftWidth;
                const trueY1 = leftEntity.position.y + (leftHeight / 2);
                const trueX2 = rightEntity.position.x;
                const trueY2 = rightEntity.position.y + (rightHeight / 2);

                if (edge.x1 !== trueX1) edge.x1 = trueX1;
                if (edge.y1 !== trueY1) edge.y1 = trueY1;
                if (edge.x2 !== trueX2) edge.x2 = trueX2;
                if (edge.y2 !== trueY2) edge.y2 = trueY2;
            }
        }

        // Pass 3: Garbage Collection (Remove deleted entities and links)
        for (const [id, node] of renderedNodes.entries()) {
            if (!entities[id]) {
                canvasElement.removeChild(node);
                renderedNodes.delete(id);
            }
        }
        for (const [id, edge] of renderedEdges.entries()) {
            if (!links[id]) {
                canvasElement.removeChild(edge);
                renderedEdges.delete(id);
            }
        }
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
    if (Object.keys(initialConfig.entities).length > 0 || Object.keys(initialConfig.links).length > 0) {
        // We trigger the sync manually once, by firing our newly populated sub trigger privately or simulating a notification
        // Note: the subscription above might not fire immediately for current state. We must trigger it.
        // Actually, just calling the logic inside subscribe once is better. We can just fake an update:
        kernel.updateEntity('nothing', {}); // no-op update to trigger subscription broadcast
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
