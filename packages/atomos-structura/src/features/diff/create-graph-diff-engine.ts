import type { DAGExchange } from '../../core/application/dag-service.js';
import type { DomainEntity, DomainLink } from '../../core/domain/entity-aggregate.js';

export type DiffChangeType = 'added' | 'modified' | 'deleted' | 'unchanged';

export interface EntityDiffItem {
  readonly entity: DomainEntity;
  readonly changeType: DiffChangeType;
  readonly changes?: readonly string[];
}

export interface LinkDiffItem {
  readonly link: DomainLink;
  readonly changeType: DiffChangeType;
}

export interface GraphDiffResult {
  readonly baseSchema: DAGExchange;
  readonly headSchema: DAGExchange;
  readonly entities: readonly EntityDiffItem[];
  readonly links: readonly LinkDiffItem[];
  readonly addedCount: number;
  readonly modifiedCount: number;
  readonly deletedCount: number;
  readonly unchangedCount: number;
}

export const compareDAGSchemas = function(baseSchema: DAGExchange, headSchema: DAGExchange): GraphDiffResult {
  const baseNodesMap = new Map<string, DomainEntity>(baseSchema.nodes.map(n => [n.id, n]));
  const headNodesMap = new Map<string, DomainEntity>(headSchema.nodes.map(n => [n.id, n]));

  const baseEdgesMap = new Map<string, DomainLink>(baseSchema.edges.map(e => [e.id, e]));
  const headEdgesMap = new Map<string, DomainLink>(headSchema.edges.map(e => [e.id, e]));

  const entityDiffs: EntityDiffItem[] = [];
  let addedCount = 0;
  let modifiedCount = 0;
  let deletedCount = 0;
  let unchangedCount = 0;

  // Process head nodes (Added or Modified/Unchanged)
  for (const [id, headNode] of headNodesMap.entries()) {
    const baseNode = baseNodesMap.get(id);
    if (!baseNode) {
      entityDiffs.push({ entity: headNode, changeType: 'added', changes: ['Entity added'] });
      addedCount++;
    } else {
      const changes: string[] = [];
      if (baseNode.name !== headNode.name) changes.push(`Name changed: "${baseNode.name}" -> "${headNode.name}"`);
      if (baseNode.x !== headNode.x || baseNode.y !== headNode.y) changes.push('Position moved');
      if (baseNode.collapsed !== headNode.collapsed) changes.push('Collapse state changed');

      const basePropCount = baseNode.properties?.length ?? 0;
      const headPropCount = headNode.properties?.length ?? 0;
      if (basePropCount !== headPropCount) changes.push(`Properties count changed (${basePropCount} -> ${headPropCount})`);

      if (changes.length > 0) {
        entityDiffs.push({ entity: headNode, changeType: 'modified', changes });
        modifiedCount++;
      } else {
        entityDiffs.push({ entity: headNode, changeType: 'unchanged' });
        unchangedCount++;
      }
    }
  }

  // Process base nodes not in head (Deleted)
  for (const [id, baseNode] of baseNodesMap.entries()) {
    if (!headNodesMap.has(id)) {
      entityDiffs.push({ entity: baseNode, changeType: 'deleted', changes: ['Entity removed'] });
      deletedCount++;
    }
  }

  // Process links
  const linkDiffs: LinkDiffItem[] = [];
  for (const [id, headEdge] of headEdgesMap.entries()) {
    const baseEdge = baseEdgesMap.get(id);
    if (!baseEdge) {
      linkDiffs.push({ link: headEdge, changeType: 'added' });
    } else {
      const isModified = baseEdge.fromId !== headEdge.fromId || baseEdge.toId !== headEdge.toId;
      linkDiffs.push({ link: headEdge, changeType: isModified ? 'modified' : 'unchanged' });
    }
  }

  for (const [id, baseEdge] of baseEdgesMap.entries()) {
    if (!headEdgesMap.has(id)) {
      linkDiffs.push({ link: baseEdge, changeType: 'deleted' });
    }
  }

  return {
    baseSchema,
    headSchema,
    entities: entityDiffs,
    links: linkDiffs,
    addedCount,
    modifiedCount,
    deletedCount,
    unchangedCount,
  };
};
