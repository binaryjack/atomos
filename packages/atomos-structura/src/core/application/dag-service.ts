import type { DomainEntity, DomainLink } from '../domain/entity-aggregate.js';
import type { EntityManager } from '../presentation/entity-manager.js';
import { determineOptimalEdges } from '../math/anchor-routing.js';

export interface SchemaCommand {
  type: string;
  [key: string]: any;
}

export interface DAGExchange {
  readonly type: 'DAGExchange';
  readonly version: string;
  readonly nodes: readonly DomainEntity[];
  readonly edges: readonly DomainLink[];
  readonly applyAfterLoad?: (string | SchemaCommand)[];
}

import { LayoutRegistry } from './layout/layout-strategy.js';
import './layout/sugiyama-layout.js';
import './layout/clear-layout.js';

export const applySchemaCommands = async (entityManager: EntityManager, commands: (string | SchemaCommand)[]) => {
  for (const rawCmd of commands) {
    const cmd = typeof rawCmd === 'string' ? { type: rawCmd } : rawCmd;
    if (cmd.type === 'optimize-connections') {
      autoRouteLinks(entityManager);
      await new Promise(r => setTimeout(r, 50));
    } else if (cmd.type === 'auto-layout') {
      const strategyName = cmd.strategy || 'sugiyama';
      const strategy = LayoutRegistry.get(strategyName);
      if (strategy) {
        strategy.execute(entityManager, cmd);
      } else {
        console.warn(`[dag-service] Unknown layout strategy: ${strategyName}`);
      }
      await new Promise(r => setTimeout(r, 50));
    } else if (cmd.type === 'fit-to-screen') {
      window.dispatchEvent(new CustomEvent(`vbs-command-fit-${entityManager.instanceId}`));
      await new Promise(r => setTimeout(r, 50));
    } else if (cmd.type === 'center-to-schema') {
      window.dispatchEvent(new CustomEvent(`vbs-command-center-${entityManager.instanceId}`));
      await new Promise(r => setTimeout(r, 50));
    }
  }
};

export const serializeDAG = function(entityManager: EntityManager): string {
  const exportData: DAGExchange = {
    type: 'DAGExchange',
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
    const data = JSON.parse(jsonString) as DAGExchange;
    
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

    if (data.applyAfterLoad && Array.isArray(data.applyAfterLoad)) {
      applySchemaCommands(entityManager, data.applyAfterLoad);
    } else if (autoLayout) {
      const strategy = LayoutRegistry.get('sugiyama');
      if (strategy) strategy.execute(entityManager);
    }
  } catch (error) {
    console.error('[dag-service] Failed to deserialize DAG', error);
    throw error;
  }
};


export const autoRouteLinks = function(entityManager: EntityManager): void {
  const nodes = entityManager.getAllEntities();
  const edges = entityManager.getAllLinks();
  
  // 1. Convert to easily queriable map
  const nodeMap = new Map<string, DomainEntity>(nodes.map(n => [n.id, n]));
  
  edges.forEach(link => {
    const src = nodeMap.get(link.sourceEntityId);
    const dst = nodeMap.get(link.targetEntityId);
    if (!src || !dst) return;
    
    const srcRect = {
      x: src.position.x,
      y: src.position.y,
      width: src.dimensions.width,
      height: src.dimensions.height
    };

    const dstRect = {
      x: dst.position.x,
      y: dst.position.y,
      width: dst.dimensions.width,
      height: dst.dimensions.height
    };

    // 2. Run the math to find best edges
    const { srcEdge: bestSrcEdge, dstEdge: bestDstEdge } = determineOptimalEdges(srcRect, dstRect);
    
    // 3. Translate edges (e.g. 'top', 'left') back to specific Anchor IDs 
    const newSrcAnchorId = `${src.id}-anchor-${bestSrcEdge}`;
    const newDstAnchorId = `${dst.id}-anchor-${bestDstEdge}`;
    
    // 4. If different from current, update via standard Domain command
    if (link.sourceAnchorId !== newSrcAnchorId || link.targetAnchorId !== newDstAnchorId) {
      entityManager.updateLinkEndpoints(
        link.id,
        newSrcAnchorId,
        newDstAnchorId,
        link.sourceEntityId,
        link.targetEntityId
      );
    }
  });
};
