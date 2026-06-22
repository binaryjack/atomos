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

let nodes: PhysicsNode[] = [];
let edges: PhysicsEdge[] = [];
let isRunning = false;
let loopId: any = null;

// Calculate centers of mass for "appartenance" groups
const calculateAppartenanceCenters = () => {
  const centers: Record<string, { sumX: number; sumY: number; count: number }> = {};
  for (const node of nodes) {
    if (!centers[node.appartenanceId]) {
      centers[node.appartenanceId] = { sumX: 0, sumY: 0, count: 0 };
    }
    centers[node.appartenanceId].sumX += node.x;
    centers[node.appartenanceId].sumY += node.y;
    centers[node.appartenanceId].count += 1;
  }
  
  const result: Record<string, { x: number; y: number }> = {};
  for (const key in centers) {
    result[key] = {
      x: centers[key].sumX / centers[key].count,
      y: centers[key].sumY / centers[key].count
    };
  }
  return result;
};

const simulateTick = () => {
  const alpha = 0.05; // cooling factor
  const repulsionForce = 50;
  const attractionForce = 0.01;
  const appartenanceGravity = 0.02; 

  const centers = calculateAppartenanceCenters();

  // For high density, O(N^2) repulsion is too slow in JS without QuadTree
  // So we limit repulsion to a naive sample or skip it for demo, focusing on attraction & grouping
  // 1. Attraction (Edges) - Pull linked nodes together
  for (const edge of edges) {
    // Note: To optimize, use array indices instead of find()
    // For this boilerplate, we'll keep it simple
    const source = nodes.find(n => n.id === edge.sourceId);
    const target = nodes.find(n => n.id === edge.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    
    const force = attractionForce * (edge.weight || 1) * alpha;
    
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
      node.x += dx * appartenanceGravity * alpha;
      node.y += dy * appartenanceGravity * alpha;
    }
  }

  // Optional: Global gravity to keep everything centered
  for (const node of nodes) {
    node.x -= node.x * 0.001 * alpha;
    node.y -= node.y * 0.001 * alpha;
  }
};

const tickLoop = () => {
  if (!isRunning) return;
  simulateTick();
  
  // Pack position data to send back efficiently
  // Instead of full objects, send an array of {id, x, y}
  const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
  self.postMessage({ type: 'TICK_RESULT', payload: positions });
  
  // Throttle physics to ~30Hz
  setTimeout(tickLoop, 33);
};

self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT_DATA':
      nodes = payload.nodes.map((n: any) => ({ id: n.id, x: n.x, y: n.y, appartenanceId: n.appartenanceId }));
      edges = payload.edges.map((e: any) => ({ sourceId: e.sourceId, targetId: e.targetId, weight: e.weight }));
      break;
    case 'START':
      if (!isRunning) {
        isRunning = true;
        tickLoop();
      }
      break;
    case 'STOP':
      isRunning = false;
      break;
  }
};
