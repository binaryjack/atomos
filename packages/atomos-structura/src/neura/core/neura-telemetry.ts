import type { NeuraEdge, NeuraEnergyBeam } from './neura-store.js';

let beamCounter = 0;
export function generateBeamId(): string {
  beamCounter++;
  return `beam_${beamCounter}_${Date.now()}`;
}

export function pruneCompletedBeams(beams: NeuraEnergyBeam[], nowMs: number): NeuraEnergyBeam[] {
  return beams.filter(beam => {
    const elapsed = nowMs - beam.startedAt;
    return elapsed < beam.durationMs;
  });
}

export function bfsShortestPath(
  sourceId: string,
  targetId: string,
  edges: Record<string, NeuraEdge>
): string[] | null {
  const adjacency = new Map<string, Array<{ neighborId: string; edgeId: string }>>();

  for (const key in edges) {
    const edge = edges[key]!;
    if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
    if (!adjacency.has(edge.targetId)) adjacency.set(edge.targetId, []);
    adjacency.get(edge.sourceId)!.push({ neighborId: edge.targetId, edgeId: edge.id });
    adjacency.get(edge.targetId)!.push({ neighborId: edge.sourceId, edgeId: edge.id });
  }

  if (!adjacency.has(sourceId) || !adjacency.has(targetId)) return null;

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: sourceId, path: [] },
  ];
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current.nodeId) ?? [];

    for (const { neighborId, edgeId } of neighbors) {
      if (visited.has(neighborId)) continue;
      const newPath = [...current.path, edgeId];

      if (neighborId === targetId) return newPath;

      visited.add(neighborId);
      queue.push({ nodeId: neighborId, path: newPath });
    }
  }

  return null;
}
