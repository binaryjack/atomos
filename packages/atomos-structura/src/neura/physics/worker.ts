export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  z: number;
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
  zSpread: number;
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
  appartenanceGravity: 0.08,
  repulsionForce: 0.02,
  restingDistance: 45,
  idealRadius: 180,
  zSpread: 1.0,
  globalGravity: 0.0005,
  alphaDecay: 0.97,
};

// Calculate 3D centers of mass for "appartenance" groups
const calculateAppartenanceCenters = () => {
  const centers: Record<string, { sumX: number; sumY: number; sumZ: number; count: number }> = {};
  for (const node of nodes) {
    if (!centers[node.appartenanceId]) {
      centers[node.appartenanceId] = { sumX: 0, sumY: 0, sumZ: 0, count: 0 };
    }
    const center = centers[node.appartenanceId]!;
    center.sumX += node.x;
    center.sumY += node.y;
    center.sumZ += node.z;
    center.count += 1;
  }

  const result: Record<string, { x: number; y: number; z: number }> = {};
  for (const key in centers) {
    const center = centers[key]!;
    result[key] = {
      x: center.sumX / center.count,
      y: center.sumY / center.count,
      z: center.sumZ / center.count,
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

  // 1. Attraction (Edges) - Pull linked nodes together in 3D
  for (const edge of edges) {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dz = target.z - source.z;

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const diff = (dist - params.restingDistance) / dist;

    const force = diff * params.attractionForce * (edge.weight || 1) * globalAlpha;

    source.x += dx * force;
    source.y += dy * force;
    source.z += dz * force * params.zSpread;

    target.x -= dx * force;
    target.y -= dy * force;
    target.z -= dz * force * params.zSpread;
  }

  // 2. Appartenance Grouping - Pull nodes towards their 3D cluster center
  for (const node of nodes) {
    const center = centers[node.appartenanceId];
    if (center) {
      const dx = center.x - node.x;
      const dy = center.y - node.y;
      const dz = center.z - node.z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const diff = (dist - params.idealRadius) / dist;

      node.x += dx * diff * params.appartenanceGravity * globalAlpha;
      node.y += dy * diff * params.appartenanceGravity * globalAlpha;
      node.z += dz * diff * params.appartenanceGravity * params.zSpread * globalAlpha;
    }
  }

  // 3. Global Gravity to keep everything centered in 3D
  if (params.globalGravity > 0) {
    for (const node of nodes) {
      node.x -= node.x * params.globalGravity * globalAlpha;
      node.y -= node.y * params.globalGravity * globalAlpha;
      node.z -= node.z * params.globalGravity * globalAlpha;
    }
  }
};

const tickLoop = () => {
  if (!isRunning) return;

  simulateTick();

  // Pack 3D position data to send back efficiently
  const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y, z: n.z }));
  self.postMessage({ type: 'TICK_RESULT', payload: positions });

  globalAlpha *= params.alphaDecay;

  if (globalAlpha < alphaMin) {
    isRunning = false;
    return;
  }

  setTimeout(tickLoop, 33);
};

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT_DATA':
      nodes = payload.nodes.map((n: any, idx: number) => {
        const zInitial = n.z ?? ((idx % 7 - 3) * 20 + Math.sin(idx) * 30);
        return {
          id: n.id,
          x: n.x,
          y: n.y,
          z: zInitial,
          appartenanceId: n.appartenanceId,
        };
      });
      edges = payload.edges.map((e: any) => ({
        sourceId: e.sourceId,
        targetId: e.targetId,
        weight: e.weight,
      }));
      globalAlpha = 1.0;
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
        globalAlpha = 1.0;
        tickLoop();
      }
      break;
    case 'STOP':
      isRunning = false;
      break;
  }
};
