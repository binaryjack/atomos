import type { Entity } from '../types/entity.types.js';
import type { LinkProps } from '../types/link.types.js';

export interface CycleDetectionResult {
  readonly hasCycles: boolean;
  readonly cycles: ReadonlyArray<readonly string[]>;
}

/**
 * Tarjan's strongly connected components algorithm to find cycles in a directed graph.
 */
export const findCycles = (
  entities: readonly Entity[],
  links: readonly LinkProps[]
): CycleDetectionResult => {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Build adjacency map
  const adj = new Map<string, string[]>();
  entities.forEach(e => adj.set(e.id, []));
  links.forEach(l => {
    const list = adj.get(l.leftEntityId);
    if (list) {
      list.push(l.rightEntityId);
    }
  });

  const strongConnect = (nodeId: string): void => {
    indices.set(nodeId, index);
    lowlinks.set(nodeId, index);
    index++;
    stack.push(nodeId);
    onStack.add(nodeId);

    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!indices.has(neighbor)) {
        strongConnect(neighbor);
        const nodeLow = lowlinks.get(nodeId)!;
        const neighborLow = lowlinks.get(neighbor)!;
        lowlinks.set(nodeId, Math.min(nodeLow, neighborLow));
      } else if (onStack.has(neighbor)) {
        const nodeLow = lowlinks.get(nodeId)!;
        const neighborIndex = indices.get(neighbor)!;
        lowlinks.set(nodeId, Math.min(nodeLow, neighborIndex));
      }
    }

    if (lowlinks.get(nodeId) === indices.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);

      // Only SCCs with size > 1 or self-loops count as cycles
      if (scc.length > 1 || (scc.length === 1 && (adj.get(nodeId) ?? []).includes(nodeId))) {
        sccs.push(scc);
      }
    }
  };

  for (const entity of entities) {
    if (!indices.has(entity.id)) {
      strongConnect(entity.id);
    }
  }

  return {
    hasCycles: sccs.length > 0,
    cycles: sccs,
  };
};
