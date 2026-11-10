// @vitest-environment happy-dom
// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { createCanvasSnapshot } from '../src/features/export/create-canvas-snapshot.js';
import { createDomCuller, type CullableNode } from '../src/features/viewport-culling/create-dom-culler.js';
import { createSnapshotSource } from '../src/features/viewport-culling/create-snapshot-source.js';

const SVG = 'http://www.w3.org/2000/svg';
const COUNT = 300;

const scene = () => {
  const svg = document.createElementNS(SVG, 'svg');
  const world = document.createElementNS(SVG, 'g');
  svg.appendChild(world);
  document.body.replaceChildren(svg);
  const nodes = new Map<string, CullableNode>();
  for (let i = 0; i < COUNT; i += 1) {
    nodes.set(`n${i}`, { position: { value: { x: i * 400, y: 0 } }, dimensions: { value: { width: 100, height: 60 } } });
    const el = document.createElementNS(SVG, 'g');
    el.setAttribute('data-entity-id', `n${i}`);
    world.appendChild(el);
  }
  const culler = createDomCuller({
    contentRoot: world, nodes: () => nodes, viewport: () => ({ pan: { x: 0, y: 0 }, zoom: 1 }), viewportSize: () => ({ width: 1000, height: 600 }),
  });
  return { svg, world, culler };
};

const countNodes = (markup: string): number => (markup.match(/data-entity-id="n\d+"/g) ?? []).length;

describe('exports include culled nodes', () => {
  it('re-mounts every culled node before serializing the SVG', () => {
    const { svg, world, culler } = scene();
    culler.update();
    expect(world.children.length).toBeLessThan(10);

    const raw = createCanvasSnapshot(() => svg).exportSVG(true) as string;
    expect(countNodes(raw)).toBeLessThan(10);

    const snapshot = createCanvasSnapshot(createSnapshotSource(() => svg, culler.restoreAll));
    expect(countNodes(snapshot.exportSVG(true) as string)).toBe(COUNT);
    expect(world.children.length).toBe(COUNT);

    culler.update();
    expect(world.children.length).toBeLessThan(10);
  });
});
