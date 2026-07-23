import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';
import { createSchemaGraphKernel } from '../core/create-schema-graph-kernel.js';

export function toMermaid(kernel: SchemaGraphKernel): string {
    const state = kernel.getSnapshot();
    const lines: string[] = ['graph TD'];
    
    // Nodes
    Object.values(state.entities).forEach(entity => {
        // A[Label]
        lines.push(`  ${entity.id}["${entity.name}"]`);
    });

    // Edges
    Object.values(state.links).forEach(link => {
        // A -->|Label| B
        // We use rightCardinality/leftCardinality or just simple arrows if no properties
        lines.push(`  ${link.leftEntityId} --> ${link.rightEntityId}`);
    });

    return lines.join('\n');
}

export function fromMermaid(mermaidSyntax: string): SchemaGraphKernel {
    const kernel = createSchemaGraphKernel();
    const lines = mermaidSyntax.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('%%'));
    
    let isGraphType = false;
    let edgeCounter = 1;

    for (const line of lines) {
        if (line.startsWith('graph ') || line.startsWith('flowchart ')) {
            isGraphType = true;
            continue;
        }

        if (!isGraphType) continue;

        // Simple edge match: A --> B or A["Label A"] --> B["Label B"]
        const edgeRegex = /^([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?\s*-->\s*([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?$/;
        const nodeRegex = /^([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?$/;

        const edgeMatch = line.match(edgeRegex);
        if (edgeMatch) {
            const [, sourceId, sourceLabel, targetId, targetLabel] = edgeMatch;
            
            if (!kernel.getSnapshot().entities[sourceId]) {
                kernel.addEntity({
                    id: sourceId,
                    name: sourceLabel || sourceId,
                    position: { x: 0, y: 0 },
                    dimensions: { width: 250, height: 150 },
                    properties: []
                } as any);
            }
            if (!kernel.getSnapshot().entities[targetId]) {
                kernel.addEntity({
                    id: targetId,
                    name: targetLabel || targetId,
                    position: { x: 0, y: 0 },
                    dimensions: { width: 250, height: 150 },
                    properties: []
                } as any);
            }

            kernel.addLink({
                id: `link-${edgeCounter++}`,
                leftEntityId: sourceId,
                rightEntityId: targetId,
                leftAnchorId: 'right',
                rightAnchorId: 'left',
                leftCardinality: '1',
                rightCardinality: '1'
            });
            continue;
        }

        const nodeMatch = line.match(nodeRegex);
        if (nodeMatch) {
            const [, nodeId, nodeLabel] = nodeMatch;
            if (!kernel.getSnapshot().entities[nodeId]) {
                kernel.addEntity({
                    id: nodeId,
                    name: nodeLabel || nodeId,
                    position: { x: 0, y: 0 },
                    dimensions: { width: 250, height: 150 },
                    properties: []
                } as any);
            }
        }
    }

    return kernel;
}
