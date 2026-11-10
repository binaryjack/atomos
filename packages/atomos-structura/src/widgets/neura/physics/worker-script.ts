export const INLINE_WORKER_SCRIPT = `
let nodes = [];
let edges = [];
let isRunning = false;
let globalAlpha = 1.0;
const alphaMin = 0.001;

let params = {
  attractionForce: 0.05,
  appartenanceGravity: 0.08,
  repulsionForce: 0.02,
  restingDistance: 45,
  idealRadius: 180,
  zSpread: 1.0,
  globalGravity: 0.0005,
  alphaDecay: 0.97
};

const calculateAppartenanceCenters = () => {
  const centers = {};
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!centers[node.appartenanceId]) {
      centers[node.appartenanceId] = { sumX: 0, sumY: 0, sumZ: 0, count: 0 };
    }
    const c = centers[node.appartenanceId];
    c.sumX += node.x;
    c.sumY += node.y;
    c.sumZ += node.z;
    c.count += 1;
  }
  const result = {};
  for (const key in centers) {
    const c = centers[key];
    result[key] = { x: c.sumX / c.count, y: c.sumY / c.count, z: c.sumZ / c.count };
  }
  return result;
};

const simulateTick = () => {
  const centers = calculateAppartenanceCenters();
  const nodeMap = new Map();
  for (let i = 0; i < nodes.length; i++) nodeMap.set(nodes[i].id, nodes[i]);

  const friction = 0.82;
  const maxSpeed = 12.0;

  // Initialize velocity accumulators
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.vx === undefined) { n.vx = 0; n.vy = 0; n.vz = 0; }
  }

  // 1. Attraction (Edges) in 3D
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dz = target.z - source.z;

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const diff = (dist - params.restingDistance) / dist;
    const force = diff * params.attractionForce * (edge.weight || 1) * globalAlpha;

    source.vx += dx * force;
    source.vy += dy * force;
    source.vz += dz * force * params.zSpread;

    target.vx -= dx * force;
    target.vy -= dy * force;
    target.vz -= dz * force * params.zSpread;
  }

  // 2. Cluster grouping in 3D
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const center = centers[node.appartenanceId];
    if (center) {
      const dx = center.x - node.x;
      const dy = center.y - node.y;
      const dz = center.z - node.z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const diff = (dist - params.idealRadius) / dist;

      node.vx += dx * diff * params.appartenanceGravity * globalAlpha;
      node.vy += dy * diff * params.appartenanceGravity * globalAlpha;
      node.vz += dz * diff * params.appartenanceGravity * params.zSpread * globalAlpha;
    }
  }

  // 3. Centering gravity in 3D
  if (params.globalGravity > 0) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.vx -= node.x * params.globalGravity * globalAlpha;
      node.vy -= node.y * params.globalGravity * globalAlpha;
      node.vz -= node.z * params.globalGravity * globalAlpha;
    }
  }

  // 4. Velocity integration, clamping & damping
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    node.vx *= friction;
    node.vy *= friction;
    node.vz *= friction;

    const speed = Math.hypot(node.vx, node.vy, node.vz);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      node.vx *= scale;
      node.vy *= scale;
      node.vz *= scale;
    }

    node.x += node.vx;
    node.y += node.vy;
    node.z += node.vz;
  }
};

const tickLoop = () => {
  if (!isRunning) return;
  simulateTick();
  const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y, z: n.z }));
  self.postMessage({ type: 'TICK_RESULT', payload: positions });
  globalAlpha *= params.alphaDecay;
  if (globalAlpha < alphaMin) {
    isRunning = false;
    return;
  }
  setTimeout(tickLoop, 33);
};

self.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === 'INIT_DATA') {
    nodes = payload.nodes.map((n, idx) => {
      const zInit = (n.z !== undefined && n.z !== null && !isNaN(n.z)) ? n.z : ((idx % 7 - 3) * 20 + Math.sin(idx) * 30);
      return { id: n.id, x: n.x, y: n.y, z: zInit, vx: 0, vy: 0, vz: 0, appartenanceId: n.appartenanceId };
    });
    edges = payload.edges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId, weight: e.weight }));
    globalAlpha = 1.0;
    // Pre-warm physics simulation internally for 15 ticks so layout settles smoothly before 1st result
    for (let i = 0; i < 15; i++) {
      simulateTick();
      globalAlpha *= params.alphaDecay;
    }
  } else if (type === 'SET_PARAMS') {
    params = { ...params, ...payload };
  } else if (type === 'REHEAT') {
    globalAlpha = Math.max(globalAlpha, payload?.alpha ?? 0.8);
    if (!isRunning) {
      isRunning = true;
      tickLoop();
    }
  } else if (type === 'START') {
    if (!isRunning) {
      isRunning = true;
      tickLoop();
    }
  } else if (type === 'STOP') {
    isRunning = false;
  }
};
`;

export function createNeuraPhysicsWorker(): Worker {
  if (typeof Worker === 'undefined') {
    return {
      postMessage: () => {},
      onmessage: null,
      terminate: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as unknown as Worker;
  }
  const blob = new Blob([INLINE_WORKER_SCRIPT], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
}
