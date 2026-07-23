import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';
import { createSchemaGraphKernel } from '../core/create-schema-graph-kernel.js';

export function toMermaid(target: SchemaGraphKernel | any): string {
    const state = typeof target?.getSnapshot === 'function' ? target.getSnapshot() : target;
    const lines: string[] = ['graph TD'];

    if (!state) return lines.join('\n');

    const entities = Array.isArray(state.entities) ? state.entities : Object.values(state.entities || {});
    const links = Array.isArray(state.links) ? state.links : Object.values(state.links || {});

    // Nodes
    entities.forEach((entity: any) => {
        lines.push(`  ${entity.id}["${entity.name}"]`);
    });

    // Edges
    links.forEach((link: any) => {
        const label = link.label ? `|"${link.label}"| ` : '';
        const sourceId = link.leftEntityId || link.fromEntityId || link.sourceEntityId;
        const targetId = link.rightEntityId || link.toEntityId || link.targetEntityId;
        if (sourceId && targetId) {
            lines.push(`  ${sourceId} -->${label}${targetId}`);
        }
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

        // Simple edge match: A --> B or A["Label A"] --> B["Label B"] or A -->|"Label"| B
        const edgeWithLabelRegex = /^([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?\s*-->\|"?([^"|]+)"?\|\s*([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?$/;
        const edgeRegex = /^([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?\s*-->\s*([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?$/;
        const nodeRegex = /^([a-zA-Z0-9_]+)(?:\["([^"]+)"\])?$/;

        const edgeWithLabelMatch = line.match(edgeWithLabelRegex);
        if (edgeWithLabelMatch) {
            const [, sourceId, sourceLabel, label, targetId, targetLabel] = edgeWithLabelMatch;

            if (!kernel.getSnapshot().entities[sourceId]) {
                kernel.addEntity({
                    id: sourceId,
                    name: sourceLabel || sourceId,
                    position: { x: 50, y: 50 },
                    dimensions: { width: 220, height: 120 },
                    properties: []
                } as any);
            }
            if (!kernel.getSnapshot().entities[targetId]) {
                kernel.addEntity({
                    id: targetId,
                    name: targetLabel || targetId,
                    position: { x: 320, y: 50 },
                    dimensions: { width: 220, height: 120 },
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
                rightCardinality: '1',
                label
            } as any);
            continue;
        }

        const edgeMatch = line.match(edgeRegex);
        if (edgeMatch) {
            const [, sourceId, sourceLabel, targetId, targetLabel] = edgeMatch;

            if (!kernel.getSnapshot().entities[sourceId]) {
                kernel.addEntity({
                    id: sourceId,
                    name: sourceLabel || sourceId,
                    position: { x: 50, y: 50 },
                    dimensions: { width: 220, height: 120 },
                    properties: []
                } as any);
            }
            if (!kernel.getSnapshot().entities[targetId]) {
                kernel.addEntity({
                    id: targetId,
                    name: targetLabel || targetId,
                    position: { x: 320, y: 50 },
                    dimensions: { width: 220, height: 120 },
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
                    position: { x: 50, y: 50 },
                    dimensions: { width: 220, height: 120 },
                    properties: []
                } as any);
            }
        }
    }

    return kernel;
}
