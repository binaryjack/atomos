import type { Entity } from '../types/entity.types.js';
import type { LinkProps } from '../types/link.types.js';

export interface GraphMetrics {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly density: number;
  readonly averageDegree: number;
  readonly maxInDegree: { entityId: string; count: number };
  readonly maxOutDegree: { entityId: string; count: number };
  readonly hubs: readonly { entityId: string; name: string; degree: number }[];
  readonly connectedComponentsCount: number;
}

export const computeGraphMetrics = (
  entities: readonly Entity[],
  links: readonly LinkProps[]
): GraphMetrics => {
  const n = entities.length;
  const e = links.length;

  if (n === 0) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      density: 0,
      averageDegree: 0,
      maxInDegree: { entityId: '', count: 0 },
      maxOutDegree: { entityId: '', count: 0 },
      hubs: [],
      connectedComponentsCount: 0,
    };
  }

  const inDeg = new Map<string, number>(entities.map(en => [en.id, 0]));
  const outDeg = new Map<string, number>(entities.map(en => [en.id, 0]));
  const adj = new Map<string, string[]>(entities.map(en => [en.id, []]));

  links.forEach(l => {
    inDeg.set(l.rightEntityId, (inDeg.get(l.rightEntityId) ?? 0) + 1);
    outDeg.set(l.leftEntityId, (outDeg.get(l.leftEntityId) ?? 0) + 1);
    adj.get(l.leftEntityId)?.push(l.rightEntityId);
    adj.get(l.rightEntityId)?.push(l.leftEntityId); // undirected for connected components
  });

  let maxIn = { entityId: '', count: -1 };
  let maxOut = { entityId: '', count: -1 };

  entities.forEach(en => {
    const inCount = inDeg.get(en.id) ?? 0;
    const outCount = outDeg.get(en.id) ?? 0;
    if (inCount > maxIn.count) maxIn = { entityId: en.id, count: inCount };
    if (outCount > maxOut.count) maxOut = { entityId: en.id, count: outCount };
  });

  // Calculate Hubs (Degree Centrality)
  const hubs = entities
    .map(en => ({
      entityId: en.id,
      name: en.name,
      degree: (inDeg.get(en.id) ?? 0) + (outDeg.get(en.id) ?? 0),
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 5);

  // Connected Components via BFS
  const visited = new Set<string>();
  let componentsCount = 0;

  entities.forEach(en => {
    if (!visited.has(en.id)) {
      componentsCount++;
      const queue = [en.id];
      visited.add(en.id);
      while (queue.length > 0) {
        const u = queue.shift()!;
        const neighbors = adj.get(u) ?? [];
        neighbors.forEach(v => {
          if (!visited.has(v)) {
            visited.add(v);
            queue.push(v);
          }
        });
      }
    }
  });

  const maxPossibleEdges = n > 1 ? n * (n - 1) : 1;
  const density = Number((e / maxPossibleEdges).toFixed(4));
  const averageDegree = Number(((2 * e) / n).toFixed(2));

  return {
    nodeCount: n,
    edgeCount: e,
    density,
    averageDegree,
    maxInDegree: maxIn.count >= 0 ? maxIn : { entityId: '', count: 0 },
    maxOutDegree: maxOut.count >= 0 ? maxOut : { entityId: '', count: 0 },
    hubs,
    connectedComponentsCount: componentsCount,
  };
};
