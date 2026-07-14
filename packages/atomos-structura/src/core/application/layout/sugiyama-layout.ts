import type { EntityManager } from '../../presentation/entity-manager.js';
import { type LayoutStrategy, type LayoutOptions, LayoutRegistry } from './layout-strategy.js';

export class SugiyamaLayout implements LayoutStrategy {
  readonly name = 'sugiyama';

  execute(entityManager: EntityManager, options?: LayoutOptions): void {
    const nodes = entityManager.getAllEntities();
    const edges = entityManager.getAllLinks();
    
    // 1. Calculate in-degrees and build adjacency list
    const inDegree = new Map<string, number>();
    const childrenList = new Map<string, string[]>();
    
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      childrenList.set(node.id, []);
    });

    edges.forEach(edge => {
      const src = edge.sourceEntityId;
      const tgt = edge.targetEntityId;
      if (inDegree.has(tgt)) {
        inDegree.set(tgt, inDegree.get(tgt)! + 1);
      }
      if (childrenList.has(src)) {
        childrenList.get(src)!.push(tgt);
      }
    });

    // 2. Topological sort by levels (Kahn's array approach)
    const levels: string[][] = [];
    let currentLevel = Array.from(inDegree.entries())
      .filter(([, deg]) => deg === 0)
      .map(([id]) => id);

    // Fallback if graph has cycles
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

    // 3. Apply positions based on levels
    const isVertical = options?.orientation === 'vertical';
    const HORIZONTAL_SPACING = options?.spacing?.horizontal || 350;
    const VERTICAL_SPACING = options?.spacing?.vertical || 200;
    const START_X = 100;
    const START_Y = 100;

    const maxNodesInLevel = Math.max(...levels.map(l => l.length));
    
    // If vertical, layers run top-to-bottom, so the "width" of a level is measured horizontally.
    // If horizontal, layers run left-to-right, so the "height" of a level is measured vertically.
    const maxTotalCrossLength = isVertical 
      ? maxNodesInLevel * HORIZONTAL_SPACING 
      : maxNodesInLevel * VERTICAL_SPACING;
    
    const baselineCenterCross = Math.max(
      isVertical ? START_X : START_Y, 
      (1000 - maxTotalCrossLength) / 2
    ) + (maxTotalCrossLength / 2);

    levels.forEach((levelNodes, levelIndex) => {
      // The distance along the primary axis
      const primaryCoord = (isVertical ? START_Y : START_X) + (levelIndex * (isVertical ? VERTICAL_SPACING : HORIZONTAL_SPACING));
      
      const totalCrossLength = levelNodes.length * (isVertical ? HORIZONTAL_SPACING : VERTICAL_SPACING);
      const startCross = baselineCenterCross - (totalCrossLength / 2);

      levelNodes.forEach((nodeId, nodeIndex) => {
        const crossOffset = (nodeIndex * (isVertical ? HORIZONTAL_SPACING : VERTICAL_SPACING)) + ((isVertical ? HORIZONTAL_SPACING : VERTICAL_SPACING) / 2) - 60; // 60 is approx half node dimension
        const crossCoord = startCross + crossOffset;

        const x = isVertical ? crossCoord : primaryCoord;
        const y = isVertical ? primaryCoord : crossCoord;

        entityManager.moveEntity(nodeId, { x, y });
      });
    });
  }
}

// Auto-register
LayoutRegistry.register(new SugiyamaLayout());
