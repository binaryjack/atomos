// @vitest-environment happy-dom
// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { anchorOwner, createDomCuller, type CullableNode } from '../src/features/viewport-culling/create-dom-culler.js';

const SVG = 'http://www.w3.org/2000/svg';
const NODES = 5000;
const EDGES = 6000;
const COLS = 100;
const W = 180;
const H = 100;
const value = <T>(v: T) => ({ value: v });

const buildScene = () => {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const svg = document.createElementNS(SVG, 'svg');
  const world = document.createElementNS(SVG, 'g');
  svg.appendChild(world);
  root.appendChild(svg);
  const nodes = new Map<string, CullableNode>();
  for (let i = 0; i < NODES; i += 1) {
    const id = `n${i}`;
    const position = { x: (i % COLS) * 220, y: Math.floor(i / COLS) * 160 };
    nodes.set(id, { position: value(position), dimensions: value({ width: W, height: H }) });
    const el = document.createElementNS(SVG, 'g');
    el.setAttribute('data-entity-id', id);
    world.appendChild(el);
  }
  for (let e = 0; e < EDGES; e += 1) {
    const source = e % NODES;
    const target = (source + 1 + (e % 3) * COLS) % NODES;
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('data-link-id', `l${e}`);
    path.setAttribute('data-source-id', `n${source}::out`);
    path.setAttribute('data-target-id', `n${target}::in`);
    const label = document.createElementNS(SVG, 'foreignObject');
    label.setAttribute('data-link-label-for', `l${e}`);
    world.append(path, label);
  }
  return { world, nodes };
};

describe('viewport culling benchmark (5,000 nodes / 6,000 edges, shadow root)', () => {
  it('keeps the mounted DOM bounded while panning and re-mounts nodes coming into view', () => {
    const { world, nodes } = buildScene();
    expect(world.children.length).toBe(NODES + EDGES * 2);
    let pan = { x: 0, y: 0 };
    const culler = createDomCuller({
      contentRoot: world, nodes: () => nodes, viewport: () => ({ pan, zoom: 1 }), viewportSize: () => ({ width: 1280, height: 800 }),
    });

    // Worst case: every element mounted up front, then culled in one pass.
    const first = culler.update();
    expect(first.mountedNodes).toBeLessThan(100);
    expect(first.culledNodes).toBe(NODES - first.mountedNodes);
    expect(world.children.length).toBeLessThan(600);

    // Steady state: a pan only swaps the elements entering / leaving the view.
    pan = { x: -11000, y: -4000 };
    const started = performance.now();
    const moved = culler.update();
    expect(performance.now() - started).toBeLessThan(2000);
    expect(moved.mountedNodes).toBeLessThan(100);
    expect(world.children.length).toBeLessThan(600);
    const centerNode = Array.from(world.children).find(el => el.getAttribute('data-entity-id') === 'n2550');
    expect(centerNode).toBeDefined();
    expect(Array.from(world.children).some(el => el.getAttribute('data-entity-id') === 'n0')).toBe(false);

    culler.restoreAll();
    expect(world.children.length).toBe(NODES + EDGES * 2);
  });

  it('resolves anchor owners for typed ports and ER side anchors', () => {
    expect(anchorOwner('node-7::out')).toBe('node-7');
    expect(anchorOwner('users-anchor-left')).toBe('users');
    expect(anchorOwner(null)).toBeNull();
  });
});
