/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNeuraInstance } from '../src/neura/create-neura-instance.js';
import type { NeuraNode, NeuraEdge } from '../src/neura/core/neura-store.js';

function createMockWebGLContext() {
  return {
    BLEND: 0x0be2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    ONE: 1,
    DEPTH_TEST: 0x0b71,
    LEQUAL: 0x0203,
    ARRAY_BUFFER: 0x8892,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    TRIANGLES: 0x0004,
    POINTS: 0x0000,
    LINES: 0x0001,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniformMatrix4fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform3f: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    depthFunc: vi.fn(),
    depthMask: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
  };
}

describe('Neura Living Morphologies & Non-Verbal Cognitive Emotion', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const mockGl = createMockWebGLContext();
    vi.spyOn(canvas, 'getContext').mockImplementation((contextId: string) => {
      if (contextId === 'webgl' || contextId === 'webgl2') {
        return mockGl as unknown as RenderingContext;
      }
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates node and edge morphologies dynamically in store', () => {
    const instance = createNeuraInstance(canvas);

    const nodes: NeuraNode[] = [
      { id: 'node-1', x: 0, y: 0, z: 0, weight: 10, appartenanceId: 'lobe-1', metadata: {}, visible: true },
      { id: 'node-2', x: 100, y: 50, z: 0, weight: 15, appartenanceId: 'lobe-1', metadata: {}, visible: true },
    ];
    const edges: NeuraEdge[] = [
      { id: 'edge-1-2', sourceId: 'node-1', targetId: 'node-2', weight: 1, visible: true },
    ];

    instance.loadGraph(nodes, edges);

    // Change node morphology
    instance.setNodeMorphology('node-1', 'soma_dendritic');
    expect(instance.store.value.nodes['node-1']?.morphology).toBe('soma_dendritic');

    // Change edge morphology
    instance.setEdgeMorphology('edge-1-2', 'synaptic_lightning');
    expect(instance.store.value.edges['edge-1-2']?.morphology).toBe('synaptic_lightning');

    instance.destroy();
  });

  it('sets cognitive emotion and brain wave frequencies correctly', () => {
    const instance = createNeuraInstance(canvas);

    instance.setCognitiveEmotion('insight', 0.95);
    expect(instance.store.value.cognitiveEmotion).toBe('insight');
    expect(instance.store.value.emotionIntensity).toBe(0.95);

    instance.setBrainWaveOscillation('gamma', 40.0, 0.9);
    expect(instance.store.value.brainWaveType).toBe('gamma');
    expect(instance.store.value.brainWaveFreq).toBe(40.0);
    expect(instance.store.value.brainWaveAmp).toBe(0.9);

    instance.destroy();
  });

  it('triggers cellular turgor pulses and synaptic lightning arcs', () => {
    const instance = createNeuraInstance(canvas);

    const nodes: NeuraNode[] = [
      { id: 'n1', x: 0, y: 0, z: 0, weight: 10, appartenanceId: 'c1', metadata: {}, visible: true },
      { id: 'n2', x: 50, y: 50, z: 0, weight: 10, appartenanceId: 'c1', metadata: {}, visible: true },
    ];
    instance.loadGraph(nodes, []);

    instance.triggerTurgorPulse('n1', 1.8, 800, 150);
    expect(instance.store.value.turgorPulses['n1']).toBeDefined();
    expect(instance.store.value.turgorPulses['n1']?.peakDilation).toBe(1.8);

    instance.triggerSynapticLightning('n1', 'n2', '#00FFFF', 400);
    expect(instance.store.value.synapticLightnings.length).toBe(1);
    expect(instance.store.value.synapticLightnings[0]?.sourceId).toBe('n1');
    expect(instance.store.value.synapticLightnings[0]?.targetId).toBe('n2');

    instance.destroy();
  });
});
