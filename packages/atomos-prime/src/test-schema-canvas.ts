import { AtpSchemaCanvas, AtpSchemaNode } from './features/schema-canvas';

// Make sure they are defined (they are automatically via their files)
console.log('Canvas Web Component loaded:', customElements.get('atp-schema-canvas'));
console.log('Node Web Component loaded:', customElements.get('atp-schema-node'));

const canvas = document.getElementById('schemaCanvas') as AtpSchemaCanvas;

// Initial state representing what the "Kernel" would provide
const state = {
    entities: {
        'e1': { id: 'e1', name: 'User', x: 100, y: 100 },
        'e2': { id: 'e2', name: 'Post', x: 350, y: 150 }
    }
};

const renderedNodes = new Map<string, AtpSchemaNode>();

function syncDOM() {
    for (const [id, entity] of Object.entries(state.entities)) {
        let node = renderedNodes.get(id);
        if (!node) {
            // Create if missing (first render)
            node = document.createElement('atp-schema-node') as AtpSchemaNode;
            
            // Set properties
            node.dataId = id;
            node.label = entity.name;
            
            // Append to canvas slot (default slot)
            canvas.appendChild(node);
            renderedNodes.set(id, node);
        }
        
        // Update position based on state
        node.x = entity.x;
        node.y = entity.y;
    }
}

// 1. Initial Render
syncDOM();

// 2. Event Listeners for Interaction (Emulating Kernel subscribe/dispatch behavior)
// When a user drags a node, the node fires \`atp-node-move\`.
// We catch it, update the state, and force a re-render.
canvas.addEventListener('atp-node-move', (e: Event) => {
    const customEvent = e as CustomEvent;
    const { id, x, y } = customEvent.detail;
    
    // Validate we know about this entity
    if (state.entities[id]) {
        // Update State (like calling kernel.updateEntityPosition)
        state.entities[id].x = x;
        state.entities[id].y = y;
        
        console.log(\`[State Update] Entity \${id} moved to (\${x}, \${y})\`);
        
        // Re-sync DOM (like kernel.subscribe() firing)
        // In a real scenario we might re-evaluate everything, but position syncs are cheap.
        syncDOM();
    }
});

canvas.addEventListener('atp-node-select', (e: Event) => {
    const customEvent = e as CustomEvent;
    const { id } = customEvent.detail;
    console.log(\`[State Update] Entity \${id} selected\`);
});
