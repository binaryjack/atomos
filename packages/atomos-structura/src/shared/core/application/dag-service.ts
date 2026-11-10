import type { DomainEntity, DomainLink } from '../domain/entity-aggregate.js';
import type { EntityManager } from '../presentation/entity-manager.js';
import { determineOptimalEdges } from '../math/anchor-routing.js';
import { getInstanceReduxStore } from '../create-redux-store.js';
import { isPortAnchorId } from '../../workflow-node/model/port-anchor.js';
import { toCreationOptions } from '../domain/entity-options.types.js';

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
import './layout/elk-layered-layout.js';
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
): Promise<void> {
  const store = getInstanceReduxStore(entityManager.instanceId);
  const data = store.transaction('Import DAG', () => applyDag(entityManager, jsonString));
  if (data.applyAfterLoad && Array.isArray(data.applyAfterLoad)) return applySchemaCommands(entityManager, data.applyAfterLoad);
  if (!autoLayout) return Promise.resolve();
  // The async ELK layout amends the import's history entry: clear + recreate + layout = ONE undo step.
  return Promise.resolve(LayoutRegistry.get('layered')?.execute(entityManager, { amendHistory: store.historyHead?.() }));
};

const applyDag = function(entityManager: EntityManager, jsonString: string): DAGExchange {
  try {
    const data = JSON.parse(jsonString) as DAGExchange;
    // Clear existing
    entityManager.getAllLinks().forEach(link => entityManager.removeLink(link.id));
    entityManager.getAllEntities().forEach(entity => entityManager.removeEntity(entity.id));

    // Restore Entities
    data.nodes.forEach(node => {
      // Lossless: appearance plus nodeType / config / metadata / ports
      entityManager.createEntity(node.id, node.name, node.position, node.dimensions, toCreationOptions(node));
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
        targetProperty: edge.targetProperty,
        direction: edge.direction
      });
    });

    return data;
  } catch (error) {
    console.error('[dag-service] Failed to deserialize DAG', error);
    throw error;
  }
};


/**
 * Re-anchors ER links to the optimal entity sides as one undo step. Links between typed
 * ports are never re-routed. Pass `onlyEntityIds` to touch only links attached to those nodes.
 */
export const autoRouteLinks = function(entityManager: EntityManager, onlyEntityIds?: ReadonlySet<string>): void {
  getInstanceReduxStore(entityManager.instanceId).transaction('Optimize connections', () => routeLinks(entityManager, onlyEntityIds));
};

const routeLinks = function(entityManager: EntityManager, onlyEntityIds?: ReadonlySet<string>): void {
  const nodes = entityManager.getAllEntities();
  const edges = entityManager.getAllLinks().filter(link =>
    !isPortAnchorId(link.sourceAnchorId) && !isPortAnchorId(link.targetAnchorId)
    && (!onlyEntityIds || onlyEntityIds.has(link.sourceEntityId) || onlyEntityIds.has(link.targetEntityId)));
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
