export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  appartenanceId: string;
}

export interface PhysicsEdge {
  sourceId: string;
  targetId: string;
  weight: number;
}

export interface PhysicsParams {
  attractionForce: number;
  appartenanceGravity: number;
  repulsionForce: number;
  restingDistance: number;
  idealRadius: number;
  globalGravity: number;
  alphaDecay: number;
}

let nodes: PhysicsNode[] = [];
let edges: PhysicsEdge[] = [];
let isRunning = false;
let globalAlpha = 1.0;
const alphaMin = 0.001;

let params: PhysicsParams = {
  attractionForce: 0.05,
  appartenanceGravity: 0.1,
  repulsionForce: 0.02,
  restingDistance: 40,
  idealRadius: 600,
  globalGravity: 0.001,
  alphaDecay: 0.96,
};

// Calculate centers of mass for "appartenance" groups
const calculateAppartenanceCenters = () => {
  const centers: Record<string, { sumX: number; sumY: number; count: number }> = {};
  for (const node of nodes) {
    if (!centers[node.appartenanceId]) {
      centers[node.appartenanceId] = { sumX: 0, sumY: 0, count: 0 };
    }
    const center = centers[node.appartenanceId]!;
    center.sumX += node.x;
    center.sumY += node.y;
    center.count += 1;
  }

  const result: Record<string, { x: number; y: number }> = {};
  for (const key in centers) {
    const center = centers[key]!;
    result[key] = {
      x: center.sumX / center.count,
      y: center.sumY / center.count,
    };
  }
  return result;
};

const simulateTick = () => {
  const centers = calculateAppartenanceCenters();
  const nodeMap = new Map<string, PhysicsNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // 1. Attraction (Edges) - Pull linked nodes together
  for (const edge of edges) {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;

    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const diff = (dist - params.restingDistance) / dist;

    const force = diff * params.attractionForce * (edge.weight || 1) * globalAlpha;

    source.x += dx * force;
    source.y += dy * force;
    target.x -= dx * force;
    target.y -= dy * force;
  }

  // 2. Appartenance Grouping - Pull nodes towards their cluster center
  for (const node of nodes) {
    const center = centers[node.appartenanceId];
    if (center) {
      const dx = center.x - node.x;
      const dy = center.y - node.y;

      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = (dist - params.idealRadius) / dist;

      node.x += dx * diff * params.appartenanceGravity * globalAlpha;
      node.y += dy * diff * params.appartenanceGravity * globalAlpha;
    }
  }

  // 3. Global Gravity to keep everything centered
  if (params.globalGravity > 0) {
    for (const node of nodes) {
      node.x -= node.x * params.globalGravity * globalAlpha;
      node.y -= node.y * params.globalGravity * globalAlpha;
    }
  }
};

const tickLoop = () => {
  if (!isRunning) return;

  simulateTick();

  // Pack position data to send back efficiently
  const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
  self.postMessage({ type: 'TICK_RESULT', payload: positions });

  globalAlpha *= params.alphaDecay;

  if (globalAlpha < alphaMin) {
    isRunning = false; // System has cooled down and is now static
    return;
  }

  // Throttle physics to ~30Hz
  setTimeout(tickLoop, 33);
};

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT_DATA':
      nodes = payload.nodes.map((n: any) => ({ id: n.id, x: n.x, y: n.y, appartenanceId: n.appartenanceId }));
      edges = payload.edges.map((e: any) => ({ sourceId: e.sourceId, targetId: e.targetId, weight: e.weight }));
      globalAlpha = 1.0; // Reset heat when new data arrives
      break;
    case 'SET_PARAMS':
      params = { ...params, ...payload };
      break;
    case 'REHEAT':
      globalAlpha = Math.max(globalAlpha, payload?.alpha ?? 0.8);
      if (!isRunning) {
        isRunning = true;
        tickLoop();
      }
      break;
    case 'START':
      if (!isRunning) {
        isRunning = true;
        globalAlpha = 1.0; // Re-heat the system
        tickLoop();
      }
      break;
    case 'STOP':
      isRunning = false;
      break;
  }
};
