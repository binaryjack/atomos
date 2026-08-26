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
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniformMatrix4fv: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    depthFunc: vi.fn(),
    viewport: vi.fn(),
    drawArrays: vi.fn(),
  };
}

describe('Neura 3D Physics & Initialization Stability', () => {
  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    // @ts-ignore
    canvas.getContext = vi.fn(() => createMockWebGLContext());
    container.appendChild(canvas);
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('initializes physics with velocity damping without NaN or infinite positions', () => {
    const instance = createNeuraInstance(canvas, {
      theme: 'cyber',
    });

    const mockNodes: NeuraNode[] = [
      { id: 'n0', x: 0, y: 0, z: 0, weight: 1, appartenanceId: 'cluster_0' },
      { id: 'n1', x: 100, y: 100, z: 50, weight: 1, appartenanceId: 'cluster_0' },
      { id: 'n2', x: -100, y: -100, z: -50, weight: 1, appartenanceId: 'cluster_1' },
    ];

    const mockEdges: NeuraEdge[] = [
      { id: 'e0', sourceId: 'n0', targetId: 'n1', weight: 1, visible: true },
      { id: 'e1', sourceId: 'n0', targetId: 'n2', weight: 1, visible: true },
    ];

    instance.loadGraph(mockNodes, mockEdges);

    const state = instance.store.value;
    expect(Object.keys(state.nodes).length).toBe(3);
    expect(Object.keys(state.edges).length).toBe(2);

    for (const key in state.nodes) {
      const node = state.nodes[key]!;
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
      expect(Number.isNaN(node.z)).toBe(false);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.z)).toBe(true);
    }

    instance.destroy();
  });
});
