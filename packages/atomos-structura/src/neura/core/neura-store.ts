import { createSignal } from '@atomos-web/prime';

export type NodeActivityState = 'idle' | 'routing' | 'active' | 'firing' | 'verifying' | 'learning';

export interface NeuraNode {
  id: string;
  x: number;
  y: number;
  z?: number;
  weight: number;
  appartenanceId: string;
  metadata: Record<string, unknown>;
  visible: boolean; // Managed by culling system
  activity?: number;           // 0.0 = idle, 1.0 = maximum luminosity
  state?: NodeActivityState;   // semantic state for color coding
  pulseFrequency?: number;     // Hz, default ~2.0
}

export interface NeuraEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  visible: boolean; // Managed by culling system
}

export interface NeuraEnergyBeam {
  id: string;
  sourceId: string;
  targetId: string;
  progress: number;      // 0.0 → 1.0 interpolation along edge
  color: string;         // hex color, e.g. '#00d4ff'
  durationMs: number;    // total travel time in ms
  startedAt: number;     // performance.now() timestamp
}

export interface NeuraViewport {
  x: number;
  y: number;
  zoom: number;
  yaw?: number;   // Horizontal 3D rotation angle in radians (0 to 2*PI)
  pitch?: number; // Vertical 3D rotation angle in radians (-PI/2 to PI/2)
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  width: number;
  height: number;
}

export interface NeuraState {
  nodes: Record<string, NeuraNode>;
  edges: Record<string, NeuraEdge>;
  viewport: NeuraViewport;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  energyBeams: NeuraEnergyBeam[];
}

/** Color mapping for NodeActivityState coronal halos */
export const STATE_HALO_COLORS: Record<NodeActivityState, [number, number, number]> = {
  idle:      [0.0, 0.0, 0.0],
  routing:   [0.0, 0.83, 1.0],    // cyan #00d4ff
  active:    [0.23, 0.51, 0.96],   // blue #3b82f6
  firing:    [1.0, 0.42, 0.0],     // orange #ff6b00
  verifying: [0.13, 0.77, 0.37],   // green #22c55e
  learning:  [0.66, 0.33, 0.97],   // purple #a855f7
};

export function createNeuraStore() {
  const store = createSignal<NeuraState>({
    nodes: {},
    edges: {},
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
      yaw: 0,
      pitch: 0,
      autoRotate: false,
      autoRotateSpeed: 0.5,
      width: 800,
      height: 600,
    },
    hoveredNodeId: null,
    selectedNodeId: null,
    energyBeams: [],
  });

  const setViewport = (viewport: Partial<NeuraViewport>) => {
    const state = store.value;
    store.set({
      ...state,
      viewport: { ...state.viewport, ...viewport },
    });
  };

  const addNodes = (nodes: NeuraNode[]) => {
    const state = store.value;
    const newNodes = { ...state.nodes };
    for (const node of nodes) {
      newNodes[node.id] = node;
    }
    store.set({ ...state, nodes: newNodes });
  };

  const addEdges = (edges: NeuraEdge[]) => {
    const state = store.value;
    const newEdges = { ...state.edges };
    for (const edge of edges) {
      newEdges[edge.id] = edge;
    }
    store.set({ ...state, edges: newEdges });
  };

  const setNodeActivity = (nodeId: string, activity: number, nodeState?: NodeActivityState) => {
    const state = store.value;
    const node = state.nodes[nodeId];
    if (!node) return;
    store.set({
      ...state,
      nodes: {
        ...state.nodes,
        [nodeId]: {
          ...node,
          activity: Math.max(0, Math.min(1, activity)),
          state: nodeState ?? node.state ?? 'idle',
        },
      },
    });
  };

  const addEnergyBeam = (beam: NeuraEnergyBeam) => {
    const state = store.value;
    store.set({
      ...state,
      energyBeams: [...state.energyBeams, beam],
    });
  };

  const removeBeam = (beamId: string) => {
    const state = store.value;
    store.set({
      ...state,
      energyBeams: state.energyBeams.filter(b => b.id !== beamId),
    });
  };

  const resetAllActivities = () => {
    const state = store.value;
    const nextNodes: Record<string, NeuraNode> = {};
    for (const key in state.nodes) {
      const n = state.nodes[key]!;
      nextNodes[key] = { ...n, activity: 0, state: 'idle' };
    }
    store.set({
      ...state,
      nodes: nextNodes,
      energyBeams: [],
    });
  };

  return {
    store,
    setViewport,
    addNodes,
    addEdges,
    setNodeActivity,
    addEnergyBeam,
    removeBeam,
    resetAllActivities,
  };
}
