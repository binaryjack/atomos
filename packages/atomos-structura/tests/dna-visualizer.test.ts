// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import { describe, it, expect, vi } from 'vitest';
import { DnaVisualizerCore } from '../src/neura/dna/dna-visualizer-core.js';
import type {
  DnaOrganVisualPlugin,
  DnaCableVisualPlugin,
} from '../src/neura/dna/dna-plugin-types.js';
import type { NeuraInstance } from '../src/neura/create-neura-instance.js';
import type { NeuraNode, NeuraEdge } from '../src/neura/core/neura-store.js';

function createMockNeura(): {
  neura: NeuraInstance;
  loadedNodes: NeuraNode[];
  loadedEdges: NeuraEdge[];
  pulsedNodes: string[];
  beams: Array<{ sourceId: string; targetId: string; color?: string }>;
  emotions: Array<{ emotion: string; intensity?: number }>;
  oscillations: Array<{ waveType: string; freq?: number; amp?: number }>;
  lightnings: Array<{ sourceId: string; targetId: string }>;
} {
  const loadedNodes: NeuraNode[] = [];
  const loadedEdges: NeuraEdge[] = [];
  const pulsedNodes: string[] = [];
  const beams: Array<{ sourceId: string; targetId: string; color?: string }> = [];
  const emotions: Array<{ emotion: string; intensity?: number }> = [];
  const oscillations: Array<{ waveType: string; freq?: number; amp?: number }> = [];
  const lightnings: Array<{ sourceId: string; targetId: string }> = [];

  const mock = {
    store: {} as never,
    webgl: {} as never,
    worker: {} as never,
    loadGraph: vi.fn((nodes: NeuraNode[], edges: NeuraEdge[]) => {
      loadedNodes.length = 0;
      loadedNodes.push(...nodes);
      loadedEdges.length = 0;
      loadedEdges.push(...edges);
    }),
    generateMockData: vi.fn(),
    flyToNode: vi.fn(),
    setCameraRotation: vi.fn(),
    setAutoRotate: vi.fn(),
    resetCamera: vi.fn(),
    setPhysicsParams: vi.fn(),
    setShaderTheme: vi.fn(),
    setLabelsMode: vi.fn(),
    reheatPhysics: vi.fn(),
    getFPS: vi.fn(() => 60),
    destroy: vi.fn(),

    setNodeActivity: vi.fn(),
    triggerEnergyBeam: vi.fn((sourceId: string, targetId: string, color?: string) => {
      beams.push({ sourceId, targetId, color });
    }),
    pulseNode: vi.fn((nodeId: string) => {
      pulsedNodes.push(nodeId);
    }),
    resetAllActivities: vi.fn(),
    highlightRoute: vi.fn(),

    setNodeMorphology: vi.fn(),
    setEdgeMorphology: vi.fn(),
    setCognitiveEmotion: vi.fn((emotion: string, intensity?: number) => {
      emotions.push({ emotion, intensity });
    }),
    triggerTurgorPulse: vi.fn(),
    triggerSynapticLightning: vi.fn((sourceId: string, targetId: string) => {
      lightnings.push({ sourceId, targetId });
    }),
    setBrainWaveOscillation: vi.fn((waveType: string, freq?: number, amp?: number) => {
      oscillations.push({ waveType, freq, amp });
    }),

    setCognitiveCharge: vi.fn(),
    fireThinkingPulse: vi.fn(),
    releaseCognitiveCharge: vi.fn(),
  } as unknown as NeuraInstance;

  return {
    neura: mock,
    loadedNodes,
    loadedEdges,
    pulsedNodes,
    beams,
    emotions,
    oscillations,
    lightnings,
  };
}

describe('DNA Visualizer Foundation (DnaVisualizerCore)', () => {
  const sampleOrgan: DnaOrganVisualPlugin = {
    plugin_version: '1.0.0',
    organ_name: 'aura_cns_trunk',
    dimension: '2D',
    color_theme: '#00d4ff',
    theme_name: 'cyan_glow',
    anchor_offset: { x: 0, y: 0, z: 0 },
    nodes: [
      { id: 'aura_cns_trunk_l0_n0', x: -50, y: -20, z: 0, weight: 1.0, layer_index: 0, neuron_index: 0 },
      { id: 'aura_cns_trunk_l1_n0', x: 50, y: 20, z: 0, weight: 1.0, layer_index: 1, neuron_index: 0 },
    ],
    sockets: [
      { name: 'grid_ingress', role: 'ingress', tensor_dim: 100, x: -70, y: 0, z: 0 },
      { name: 'main_features', role: 'egress', tensor_dim: 100, x: 70, y: 0, z: 0 },
    ],
    stimulus_controls: [
      {
        id: 'inject_pattern',
        label: 'Inject Sensory Pattern',
        type: 'button',
        target_socket: 'grid_ingress',
        action: 'dna_neural_infer',
        description: 'Injects a 100-dim discrete vector.',
      },
    ],
    telemetry_mapping: [0, 1],
  };

  const sampleCable: DnaCableVisualPlugin = {
    plugin_version: '1.0.0',
    cable_name: 'cns_to_thalamus',
    source_organ: 'aura_cns_trunk',
    source_socket: 'main_features',
    target_organ: 'aura_thalamus',
    target_socket: 'grid_ingress',
    has_adaptation: true,
    beam_style: {
      color: '#00d4ff',
      durationMs: 600,
      pulse_type: 'synaptic_beam',
    },
    edges: [
      {
        id: 'aura_cns_trunk_to_aura_thalamus',
        sourceId: 'aura_cns_trunk:main_features',
        targetId: 'aura_thalamus:grid_ingress',
        source_coord: { x: 70, y: 0, z: 0 },
        target_coord: { x: 140, y: 0, z: 0 },
        weight: 1.5,
      },
    ],
  };

  it('loads organ visual twin and anchors sockets and neurons into Neura 3D graph', () => {
    const { neura, loadedNodes, loadedEdges } = createMockNeura();
    const core = new DnaVisualizerCore(neura);

    core.loadOrganPlugin(sampleOrgan);

    expect(core.getOrgan('aura_cns_trunk')).toBeDefined();
    expect(loadedNodes.length).toBe(4); // 2 neurons + 2 sockets
    expect(loadedNodes.some((n) => n.id === 'aura_cns_trunk:grid_ingress')).toBe(true);
    expect(loadedNodes.some((n) => n.id === 'aura_cns_trunk:main_features')).toBe(true);
    expect(loadedEdges.length).toBeGreaterThanOrEqual(1); // socket-to-neuron links
  });

  it('loads synaptic cable visual twin into Neura 3D graph', () => {
    const { neura, loadedEdges } = createMockNeura();
    const core = new DnaVisualizerCore(neura);

    core.loadOrganPlugin(sampleOrgan);
    core.loadCablePlugin(sampleCable);

    expect(core.getCable('cns_to_thalamus')).toBeDefined();
    expect(loadedEdges.some((e) => e.id === 'aura_cns_trunk_to_aura_thalamus')).toBe(true);
    const cableEdge = loadedEdges.find((e) => e.id === 'aura_cns_trunk_to_aura_thalamus');
    expect(cableEdge?.morphology).toBe('myelinated_tube');
  });

  it('dispatches self-describing stimulus control to 3D engine', async () => {
    const { neura, pulsedNodes } = createMockNeura();
    const core = new DnaVisualizerCore(neura);

    core.loadOrganPlugin(sampleOrgan);

    const controls = core.getAllStimulusControls();
    expect(controls.length).toBe(1);
    expect(controls[0]?.id).toBe('inject_pattern');

    const result = await core.dispatchStimulus('inject_pattern');
    expect(result.success).toBe(true);
    expect(result.dispatchedEffects).toContain('neural_inference_cascade');
    expect(pulsedNodes).toContain('aura_cns_trunk:grid_ingress');
  });

  it('handles conflict injection and triggers GABA clamp & lightning', async () => {
    const { neura, emotions, lightnings } = createMockNeura();
    const core = new DnaVisualizerCore(neura);

    const accOrgan: DnaOrganVisualPlugin = {
      ...sampleOrgan,
      organ_name: 'aura_acc',
      nodes: [
        { id: 'acc_n0', x: 0, y: 120, z: 0, weight: 1.0, layer_index: 0, neuron_index: 0 },
        { id: 'acc_n1', x: 0, y: 140, z: 0, weight: 1.0, layer_index: 1, neuron_index: 0 },
      ],
      stimulus_controls: [
        {
          id: 'inject_conflict',
          label: 'Inject Conflict',
          type: 'button',
          action: 'inject_surprise_residual',
        },
      ],
    };

    core.loadOrganPlugin(accOrgan);
    const res = await core.dispatchStimulus('inject_conflict');

    expect(res.success).toBe(true);
    expect(emotions.some((e) => e.emotion === 'conflict')).toBe(true);
    expect(lightnings.length).toBe(1);
  });

  it('handles ATP metabolic transfer stimulus control', async () => {
    const { neura, beams } = createMockNeura();
    const core = new DnaVisualizerCore(neura);

    const allostasisOrgan: DnaOrganVisualPlugin = {
      ...sampleOrgan,
      organ_name: 'aura_allostasis',
      stimulus_controls: [
        {
          id: 'rebalance_atp',
          label: 'Transfer ATP',
          type: 'button',
          action: 'dna_atp_transfer',
          args: { from_organ: 'aura_allostasis', to_organ: 'aura_cns_trunk', amount: 25000 },
        },
      ],
    };

    core.loadOrganPlugin(allostasisOrgan);
    const res = await core.dispatchStimulus('rebalance_atp');

    expect(res.success).toBe(true);
    expect(beams.some((b) => b.sourceId === 'aura_allostasis:main_features')).toBe(true);
  });
});
