import type { EntityManager } from '../../presentation/entity-manager.js';
import { type LayoutOptions, type LayoutStrategy, LayoutRegistry } from './layout-strategy.js';

export class RadialLayout implements LayoutStrategy {
  readonly name = 'radial';

  execute(entityManager: EntityManager, options?: LayoutOptions): void {
    const nodes = entityManager.getAllEntities();
    const edges = entityManager.getAllLinks();
    if (nodes.length === 0) return;

    // 1. Build undirected adjacency map
    const adj = new Map<string, string[]>();
    nodes.forEach(node => adj.set(node.id, []));
    edges.forEach(edge => {
      adj.get(edge.sourceEntityId)?.push(edge.targetEntityId);
      adj.get(edge.targetEntityId)?.push(edge.sourceEntityId);
    });

    // 2. Determine root entity (highest degree node or root option)
    let rootId = options?.rootId as string | undefined;
    if (!rootId || !adj.has(rootId)) {
      let maxDeg = -1;
      nodes.forEach(node => {
        const deg = adj.get(node.id)?.length ?? 0;
        if (deg > maxDeg) {
          maxDeg = deg;
          rootId = node.id;
        }
      });
    }

    if (!rootId) return;

    // 3. BFS levels from root
    const levels: string[][] = [[rootId]];
    const visited = new Set<string>([rootId]);
    let currentQueue = [rootId];

    while (currentQueue.length > 0) {
      const nextQueue: string[] = [];
      currentQueue.forEach(u => {
        const neighbors = adj.get(u) ?? [];
        neighbors.forEach(v => {
          if (!visited.has(v)) {
            visited.add(v);
            nextQueue.push(v);
          }
        });
      });

      if (nextQueue.length > 0) {
        levels.push(nextQueue);
      }
      currentQueue = nextQueue;
    }

    // Include unvisited disconnected nodes on outer ring
    const unvisited = nodes.filter(n => !visited.has(n.id)).map(n => n.id);
    if (unvisited.length > 0) {
      levels.push(unvisited);
    }

    // 4. Position nodes radially around (centerX, centerY)
    const centerX = options?.centerX ?? 600;
    const centerY = options?.centerY ?? 500;
    const RADIUS_STEP = options?.radiusStep ?? 280;

    levels.forEach((ringNodes, ringIndex) => {
      if (ringIndex === 0) {
        // Center node
        entityManager.moveEntity(ringNodes[0]!, { x: centerX - 100, y: centerY - 50 });
        return;
      }

      const radius = ringIndex * RADIUS_STEP;
      const count = ringNodes.length;
      const angleStep = (2 * Math.PI) / count;

      ringNodes.forEach((nodeId, nodeIndex) => {
        const angle = nodeIndex * angleStep - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - 100;
        const y = centerY + radius * Math.sin(angle) - 50;

        entityManager.moveEntity(nodeId, {
          x: Math.round(x),
          y: Math.round(y),
        });
      });
    });
  }
}

// Auto-register
LayoutRegistry.register(new RadialLayout());
