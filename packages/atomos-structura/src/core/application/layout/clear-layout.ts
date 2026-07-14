import type { EntityManager } from '../../presentation/entity-manager.js';
import { type LayoutStrategy, type LayoutOptions, LayoutRegistry } from './layout-strategy.js';

export class ClearLayout implements LayoutStrategy {
  readonly name = 'clair';

  execute(entityManager: EntityManager, options?: LayoutOptions): void {
    const nodes = entityManager.getAllEntities();
    const edges = entityManager.getAllLinks();
    
    if (nodes.length === 0) return;

    // 1. Calculate in-degrees and build adjacency list
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const childrenList = new Map<string, string[]>();
    const parentsList = new Map<string, string[]>();
    
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      outDegree.set(node.id, 0);
      childrenList.set(node.id, []);
      parentsList.set(node.id, []);
    });

    edges.forEach(edge => {
      const src = edge.sourceEntityId;
      const tgt = edge.targetEntityId;
      if (inDegree.has(tgt)) {
        inDegree.set(tgt, inDegree.get(tgt)! + 1);
        parentsList.get(tgt)!.push(src);
      }
      if (outDegree.has(src)) {
        outDegree.set(src, outDegree.get(src)! + 1);
        childrenList.get(src)!.push(tgt);
      }
    });

    // 2. Topological sort by levels (Kahn's array approach)
    const levels: string[][] = [];
    let currentLevel = Array.from(inDegree.entries())
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id);

    const processed = new Set<string>();

    while (currentLevel.length > 0) {
      levels.push(currentLevel);
      currentLevel.forEach(id => processed.add(id));

      const nextLevel: string[] = [];
      currentLevel.forEach(id => {
        const children = childrenList.get(id) || [];
        children.forEach(child => {
          const currentDeg = inDegree.get(child)! - 1;
          inDegree.set(child, currentDeg);
          if (currentDeg === 0 && !processed.has(child)) {
            nextLevel.push(child);
          }
        });
      });
      currentLevel = nextLevel;
    }

    // Handle disconnected cycle nodes
    const cyclics = nodes.filter(n => !processed.has(n.id)).map(n => n.id);
    if (cyclics.length > 0) {
      levels.push(cyclics);
    }

    // 3. Crossing Minimization (Barycenter Heuristic)
    const sweeps = 4;
    for (let sweep = 0; sweep < sweeps; sweep++) {
      // Forward Sweep (Top to Bottom)
      for (let i = 1; i < levels.length; i++) {
        const currentLayer = levels[i];
        const prevLayer = levels[i - 1];
        if (!currentLayer || !prevLayer) continue;
        
        const barycenters = new Map<string, number>();
        currentLayer.forEach(nodeId => {
          const parents = parentsList.get(nodeId) || [];
          let sum = 0;
          let count = 0;
          parents.forEach(pId => {
            const index = prevLayer.indexOf(pId);
            if (index !== -1) {
              sum += index;
              count++;
            }
          });
          barycenters.set(nodeId, count > 0 ? sum / count : currentLayer.indexOf(nodeId));
        });

        currentLayer.sort((a, b) => barycenters.get(a)! - barycenters.get(b)!);
      }

      // Backward Sweep (Bottom to Top)
      for (let i = levels.length - 2; i >= 0; i--) {
        const currentLayer = levels[i];
        const nextLayer = levels[i + 1];
        if (!currentLayer || !nextLayer) continue;

        const barycenters = new Map<string, number>();
        currentLayer.forEach(nodeId => {
          const children = childrenList.get(nodeId) || [];
          let sum = 0;
          let count = 0;
          children.forEach(cId => {
            const index = nextLayer.indexOf(cId);
            if (index !== -1) {
              sum += index;
              count++;
            }
          });
          barycenters.set(nodeId, count > 0 ? sum / count : currentLayer.indexOf(nodeId));
        });

        currentLayer.sort((a, b) => barycenters.get(a)! - barycenters.get(b)!);
      }
    }

    // 4. Apply coordinates
    const HORIZONTAL_SPACING = options?.spacing?.horizontal || 400;
    const VERTICAL_SPACING = options?.spacing?.vertical || 250;
    const START_X = 100;
    const START_Y = 100;

    const maxNodesInLevel = Math.max(...levels.map(l => l.length));
    const maxTotalHeight = maxNodesInLevel * VERTICAL_SPACING;
    const baselineCenterY = Math.max(START_Y, (1000 - maxTotalHeight) / 2) + (maxTotalHeight / 2);

    levels.forEach((levelNodes, levelIndex) => {
      const x = START_X + (levelIndex * HORIZONTAL_SPACING);
      
      const totalHeight = levelNodes.length * VERTICAL_SPACING;
      const startY = baselineCenterY - (totalHeight / 2);

      levelNodes.forEach((nodeId, nodeIndex) => {
        // Node dimensions typically ~220x180, adjust center
        const y = startY + (nodeIndex * VERTICAL_SPACING) + (VERTICAL_SPACING / 2) - 90;
        entityManager.moveEntity(nodeId, { x, y });
      });
    });
  }
}

// Auto-register
LayoutRegistry.register(new ClearLayout());
