export interface Signal<T> {
  value: T;
  set: (newValue: T) => void;
  subscribe: (callback: (value: T) => void) => () => void;
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  const subscribers = new Set<(value: T) => void>();

  return {
    get value() {
      return currentValue;
    },
    set: (newValue: T) => {
      if (currentValue !== newValue) {
        currentValue = newValue;
        subscribers.forEach(callback => callback(newValue));
      }
    },
    subscribe: (callback: (value: T) => void) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}

export type NodeActivityState = 'idle' | 'routing' | 'active' | 'firing' | 'verifying' | 'learning';

export type NodeMorphology =
  | 'soma_spherical'
  | 'soma_dendritic'
  | 'quantum_crystal'
  | 'vesicle_hologram'
  | 'ring_oracle';

export type EdgeMorphology =
  | 'wire'
  | 'myelinated_tube'
  | 'synaptic_lightning'
  | 'quantum_flow'
  | 'catenary_curve';

export type CognitiveEmotion =
  | 'harmonic_focus'
  | 'curiosity'
  | 'conflict'
  | 'insight'
  | 'high_load'
  | 'dreaming';

export type BrainWaveType = 'alpha' | 'beta' | 'gamma' | 'theta' | 'delta';

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
  morphology?: NodeMorphology; // visual morphologic geometry
  pulseFrequency?: number;     // Hz, default ~2.0
  turgorScale?: number;        // Current dilation factor (1.0 = rest, 1.8 = peak turgor)
  tentacleCount?: number;      // Dendritic rays (e.g. 5 to 8)
}

export interface NeuraEdge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  visible: boolean; // Managed by culling system
  morphology?: EdgeMorphology;
  flowVelocity?: number;
  lightningEnergy?: number;
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

export interface ThinkingPulseState {
  active: boolean;
  startTime: number;
  durationMs: number;
  color: string;
  origin: [number, number, number];
  maxRadius: number;
}

export interface SynapticLightningState {
  id: string;
  sourceId: string;
  targetId: string;
  color: string;
  durationMs: number;
  startedAt: number;
  jaggedness: number;
  branches: number;
}

export interface TurgorPulseState {
  nodeId: string;
  peakDilation: number;
  durationMs: number;
  attackMs: number;
  startedAt: number;
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
  synapticLightnings: SynapticLightningState[];
  turgorPulses: Record<string, TurgorPulseState>;
  cognitiveCharge: number; // 0.0 (rest glow = 0.2) to 1.0 (max glow = 0.9)
  cognitiveEmotion: CognitiveEmotion;
  emotionIntensity: number;
  brainWaveType: BrainWaveType;
  brainWaveFreq: number; // Hz
  brainWaveAmp: number;
  thinkingPulse: ThinkingPulseState | null;
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

/** Color mapping for CognitiveEmotion auras */
export const EMOTION_AURA_COLORS: Record<CognitiveEmotion, [number, number, number]> = {
  harmonic_focus: [0.0, 0.94, 1.0],   // electric cyan #00F0FF
  curiosity:      [0.0, 1.0, 0.6],    // emerald borealis #00FF99
  conflict:       [1.0, 0.0, 0.33],   // neon magenta/amber jitter #FF0055
  insight:        [1.0, 0.84, 0.0],   // solar gold #FFD700
  high_load:      [1.0, 0.2, 0.0],    // plasma red #FF3300
  dreaming:       [0.58, 0.0, 1.0],   // deep bioluminescent violet #9400D3
};

/** Frequency mapping for BrainWaveType (Hz) */
export const BRAIN_WAVE_FREQUENCIES: Record<BrainWaveType, number> = {
  alpha: 10.0,
  beta:  20.0,
  gamma: 40.0,
  theta: 5.0,
  delta: 1.5,
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
    synapticLightnings: [],
    turgorPulses: {},
    cognitiveCharge: 0.0,
    cognitiveEmotion: 'harmonic_focus',
    emotionIntensity: 0.8,
    brainWaveType: 'alpha',
    brainWaveFreq: 10.0,
    brainWaveAmp: 0.5,
    thinkingPulse: null,
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
      newNodes[node.id] = {
        ...node,
        morphology: node.morphology ?? 'soma_spherical',
        turgorScale: 1.0,
        tentacleCount: node.tentacleCount ?? 6,
      };
    }
    store.set({ ...state, nodes: newNodes });
  };

  const addEdges = (edges: NeuraEdge[]) => {
    const state = store.value;
    const newEdges = { ...state.edges };
    for (const edge of edges) {
      newEdges[edge.id] = {
        ...edge,
        morphology: edge.morphology ?? 'wire',
      };
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

  const setNodeMorphology = (nodeId: string, morphology: NodeMorphology) => {
    const state = store.value;
    const node = state.nodes[nodeId];
    if (!node) return;
    store.set({
      ...state,
      nodes: {
        ...state.nodes,
        [nodeId]: { ...node, morphology },
      },
    });
  };

  const setEdgeMorphology = (edgeId: string, morphology: EdgeMorphology) => {
    const state = store.value;
    const edge = state.edges[edgeId];
    if (!edge) return;
    store.set({
      ...state,
      edges: {
        ...state.edges,
        [edgeId]: { ...edge, morphology },
      },
    });
  };

  const setCognitiveEmotion = (emotion: CognitiveEmotion, intensity = 1.0) => {
    const state = store.value;
    store.set({
      ...state,
      cognitiveEmotion: emotion,
      emotionIntensity: Math.max(0, Math.min(1, intensity)),
    });
  };

  const setBrainWaveOscillation = (waveType: BrainWaveType, freq?: number, amp = 0.5) => {
    const state = store.value;
    store.set({
      ...state,
      brainWaveType: waveType,
      brainWaveFreq: freq ?? BRAIN_WAVE_FREQUENCIES[waveType],
      brainWaveAmp: Math.max(0, Math.min(1, amp)),
    });
  };

  const triggerTurgorPulse = (nodeId: string, peakDilation = 1.6, durationMs = 700, attackMs = 120) => {
    const state = store.value;
    store.set({
      ...state,
      turgorPulses: {
        ...state.turgorPulses,
        [nodeId]: {
          nodeId,
          peakDilation,
          durationMs,
          attackMs,
          startedAt: performance.now(),
        },
      },
    });
  };

  const triggerSynapticLightning = (lightning: SynapticLightningState) => {
    const state = store.value;
    store.set({
      ...state,
      synapticLightnings: [...state.synapticLightnings, lightning],
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

  const setCognitiveChargeStore = (level: number) => {
    const state = store.value;
    store.set({
      ...state,
      cognitiveCharge: Math.max(0, Math.min(1, level)),
    });
  };

  const setThinkingPulseStore = (pulse: ThinkingPulseState | null) => {
    const state = store.value;
    store.set({
      ...state,
      thinkingPulse: pulse,
    });
  };

  const resetAllActivities = () => {
    const state = store.value;
    const nextNodes: Record<string, NeuraNode> = {};
    for (const key in state.nodes) {
      const n = state.nodes[key]!;
      nextNodes[key] = { ...n, activity: 0, state: 'idle', turgorScale: 1.0 };
    }
    store.set({
      ...state,
      nodes: nextNodes,
      energyBeams: [],
      synapticLightnings: [],
      turgorPulses: {},
      cognitiveCharge: 0.0,
      thinkingPulse: null,
    });
  };

  return {
    store,
    setViewport,
    addNodes,
    addEdges,
    setNodeActivity,
    setNodeMorphology,
    setEdgeMorphology,
    setCognitiveEmotion,
    setBrainWaveOscillation,
    triggerTurgorPulse,
    triggerSynapticLightning,
    addEnergyBeam,
    removeBeam,
    setCognitiveChargeStore,
    setThinkingPulseStore,
    resetAllActivities,
  };
}
