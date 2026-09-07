// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import { describe, it, expect, vi } from 'vitest';
import {
  mat4Create,
  mat4Perspective,
  mat4LookAt,
  mat4Multiply,
  parseHexColor,
} from '../src/neura/math/math3d.js';
import { generateMockGraph } from '../src/neura/data/mock-graph-generator.js';
import { CameraController } from '../src/neura/controllers/camera-controller.js';
import type { NeuraViewport } from '../src/neura/core/neura-store.js';

describe('Neura 3D Math Engine (math3d.ts)', () => {
  it('creates a standard 4x4 identity matrix', () => {
    const m = mat4Create();
    expect(m).toHaveLength(16);
    expect(m[0]).toBe(1);
    expect(m[5]).toBe(1);
    expect(m[10]).toBe(1);
    expect(m[15]).toBe(1);
    expect(m[1]).toBe(0);
    expect(m[4]).toBe(0);
  });

  it('computes perspective projection matrix correctly', () => {
    const out = mat4Create();
    mat4Perspective(out, Math.PI / 4, 16 / 9, 1, 1000);
    expect(out[11]).toBe(-1);
    expect(out[15]).toBe(0);
    expect(out[0]).toBeGreaterThan(0);
    expect(out[5]).toBeGreaterThan(0);
  });

  it('computes lookAt view matrix correctly', () => {
    const out = mat4Create();
    mat4LookAt(out, [0, 0, 10], [0, 0, 0], [0, 1, 0]);
    expect(out[15]).toBe(1);
    expect(out[14]).toBeCloseTo(-10, 3);
  });

  it('multiplies identity matrices to return identity', () => {
    const a = mat4Create();
    const b = mat4Create();
    const out = mat4Create();
    mat4Multiply(out, a, b);
    expect(out[0]).toBe(1);
    expect(out[5]).toBe(1);
    expect(out[10]).toBe(1);
    expect(out[15]).toBe(1);
  });

  it('parses valid 6-char hex colors and returns normalized RGB floats', () => {
    const [r, g, b] = parseHexColor('#ff0080');
    expect(r).toBeCloseTo(1.0, 2);
    expect(g).toBeCloseTo(0.0, 2);
    expect(b).toBeCloseTo(128 / 255, 2);
  });

  it('falls back to white on malformed hex color strings', () => {
    const [r, g, b] = parseHexColor('invalid');
    expect(r).toBe(1.0);
    expect(g).toBe(1.0);
    expect(b).toBe(1.0);
  });
});

describe('Synthetic Graph Generator (mock-graph-generator.ts)', () => {
  it('generates the specified number of nodes with connected edges', () => {
    const { nodes, edges } = generateMockGraph(25);
    expect(nodes).toHaveLength(25);
    expect(edges.length).toBeGreaterThan(0);

    for (const node of nodes) {
      expect(node.id).toMatch(/^n\d+$/);
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
      expect(typeof node.z).toBe('number');
      expect(node.weight).toBeGreaterThanOrEqual(0);
      expect(node.weight).toBeLessThanOrEqual(1);
      expect(node.appartenanceId).toMatch(/^cluster_\d+$/);
    }
  });
});

describe('Neura Camera Controller (camera-controller.ts)', () => {
  it('clamps pitch rotation within [-1.4, 1.4] radians', () => {
    let vp: NeuraViewport = {
      x: 0,
      y: 0,
      zoom: 1,
      yaw: 0,
      pitch: 0,
      width: 800,
      height: 600,
    };

    const canvas = { width: 800, height: 600 } as HTMLCanvasElement;
    const controller = new CameraController({
      canvas,
      getViewport: () => vp,
      setViewport: (next) => {
        vp = { ...vp, ...next };
      },
      getNode: () => undefined,
    });

    controller.setCameraRotation(0.5, 3.5); // Over upper bound
    expect(vp.pitch).toBe(1.4);

    controller.setCameraRotation(0.5, -4.0); // Below lower bound
    expect(vp.pitch).toBe(-1.4);

    controller.setCameraRotation(0.8, 0.2); // Normal
    expect(vp.pitch).toBe(0.2);
    expect(vp.yaw).toBe(0.8);
  });

  it('resets camera to standard centered constellation viewport', () => {
    let vp: NeuraViewport = {
      x: 100,
      y: 200,
      zoom: 3,
      yaw: 1.2,
      pitch: 0.8,
      width: 1000,
      height: 800,
    };

    const canvas = { width: 1200, height: 900 } as HTMLCanvasElement;
    const controller = new CameraController({
      canvas,
      getViewport: () => vp,
      setViewport: (next) => {
        vp = { ...vp, ...next };
      },
      getNode: () => undefined,
    });

    controller.resetCamera();
    expect(vp.x).toBe(0);
    expect(vp.y).toBe(0);
    expect(vp.zoom).toBe(0.35);
    expect(vp.yaw).toBe(0);
    expect(vp.pitch).toBe(0);
    expect(vp.width).toBe(1200);
    expect(vp.height).toBe(900);
  });
});
