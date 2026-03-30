import type { DomainEntity, DomainLink } from '../domain/entity-aggregate.js';
import type { EntityManager } from '../presentation/entity-manager.js';

export interface DAGExport {
  readonly version: string;
  readonly nodes: readonly DomainEntity[];
  readonly edges: readonly DomainLink[];
}

export const serializeDAG = function(entityManager: EntityManager): string {
  const exportData: DAGExport = {
    version: '1.0.0',
    nodes: entityManager.getAllEntities(),
    edges: entityManager.getAllLinks(),
  };
  return JSON.stringify(exportData, null, 2);
};

export const deserializeDAG = function(
  entityManager: EntityManager,
  jsonString: string,
  autoLayout: boolean = true
): void {
  try {
    const data = JSON.parse(jsonString) as DAGExport;
    
    // Clear existing
    entityManager.getAllLinks().forEach(link => entityManager.removeLink(link.id));
    entityManager.getAllEntities().forEach(entity => entityManager.removeEntity(entity.id));

    // Restore Entities
    data.nodes.forEach(node => {
      entityManager.createEntity(node.id, node.name, node.position, node.dimensions, {
        shape: (node as any).shape,
        color: (node as any).color,
        description: (node as any).description
      });
      entityManager.updateEntityProperties(node.id, node.properties);
    });

    // Restore Links
    data.edges.forEach(edge => {
      entityManager.createLink(
        edge.id, 
        edge.sourceAnchorId, 
        edge.targetAnchorId, 
        edge.sourceEntityId, 
        edge.targetEntityId
      );
      entityManager.updateLinkProperties(edge.id, {
        sourceCardinality: edge.sourceCardinality,
        targetCardinality: edge.targetCardinality,
        sourceProperty: edge.sourceProperty,
        targetProperty: edge.targetProperty
      });
    });

    if (autoLayout) {
      autoLayoutDAG(entityManager);
    }
  } catch (error) {
    console.error('[dag-service] Failed to deserialize DAG', error);
    throw error;
  }
};

export const autoLayoutDAG = function(entityManager: EntityManager): void {
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

  // Fallback if graph has cycles (though topology system prevents them)
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
  const HORIZONTAL_SPACING = 350;
  const VERTICAL_SPACING = 250;
  const START_X = 100;
  const START_Y = 100;

  levels.forEach((levelNodes, levelIndex) => {
    const x = START_X + (levelIndex * HORIZONTAL_SPACING);
    
    // Center vertically based on number of nodes in level
    const totalHeight = levelNodes.length * VERTICAL_SPACING;
    const startY = Math.max(START_Y, (1000 - totalHeight) / 2); // Approximate centering

    levelNodes.forEach((nodeId, nodeIndex) => {
      const y = startY + (nodeIndex * VERTICAL_SPACING);
      entityManager.moveEntity(nodeId, { x, y });
    });
  });
};
