// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import type { Entity, PortSpec } from '@atomos-web/structura-core';
import { buildElkGraph, toElkPorts } from '../src/shared/core/application/layout/elk-graph.js';
import { runElkLayout } from '../src/shared/core/application/layout/elk-layered-layout.js';
import { getInstanceReduxStore } from '../src/shared/core/create-redux-store.js';
import { getEntityManager } from '../src/shared/core/presentation/entity-manager.js';
import { getActiveSchema } from '../src/shared/workflow-canvas/connection-graph.js';

const ports: PortSpec[] = [
  { id: 'i1', direction: 'in', dataType: 'json' }, { id: 'i2', direction: 'in', dataType: 'json' },
  { id: 'o', direction: 'out', dataType: 'json' },
];

const seed = (instanceId: string) => {
  const store = getInstanceReduxStore(instanceId, { persistence: false });
  const manager = getEntityManager(instanceId);
  ['a', 'b', 'c'].forEach((id, i) => manager.createEntity(id, id, { x: 500 - i * 200, y: 0 }, { width: 160, height: 80 }, { nodeType: 'task', ports }));
  manager.createLink('ab', 'a::o', 'b::i1', 'a', 'b');
  manager.createLink('bc', 'b::o', 'c::i2', 'b', 'c');
  return { store, manager };
};

const xOf = (instanceId: string, id: string) =>
  getActiveSchema(getInstanceReduxStore(instanceId).get_state())?.entities.find(e => e.id === id)?.position.x ?? NaN;

describe('ELK layered layout', () => {
  it('declares FIXED_ORDER ports: inputs west, outputs east, in declaration order', () => {
    const elkPorts = toElkPorts('n', ports);
    expect(elkPorts.map(p => [p.id, p.layoutOptions?.['elk.port.side'], p.layoutOptions?.['elk.port.index']])).toEqual([
      ['n::o', 'EAST', '0'], ['n::i1', 'WEST', '2'], ['n::i2', 'WEST', '1'],
    ]);
    const node = { id: 'n', code: 'n', name: 'n', createdAt: 0, updatedAt: 0, properties: [], edges: [], position: { x: 0, y: 0 }, dimensions: { width: 120, height: 60 }, ports } as Entity;
    const graph = buildElkGraph([node], []);
    expect(graph.children?.[0]).toMatchObject({ width: 120, height: 60, layoutOptions: { 'elk.portConstraints': 'FIXED_ORDER' } });
    expect(graph.layoutOptions?.['elk.algorithm']).toBe('layered');
  });

  it('orders nodes left to right along port links, in one undo step', async () => {
    const { store } = seed('elk-1');
    const undoBefore = store.can_undo();
    const result = await runElkLayout(getEntityManager('elk-1'));
    expect(result).toMatchObject({ applied: true, moved: 3 });
    expect(xOf('elk-1', 'a')).toBeLessThan(xOf('elk-1', 'b'));
    expect(xOf('elk-1', 'b')).toBeLessThan(xOf('elk-1', 'c'));
    expect(undoBefore).toBe(true);
    store.undo();
    expect(xOf('elk-1', 'a')).toBe(500);
  });

  it('never writes stale results when the document changed during layout', async () => {
    const { manager } = seed('elk-2');
    const pending = runElkLayout(manager);
    manager.moveEntity('a', { x: 999, y: 999 });
    await expect(pending).resolves.toEqual({ applied: false, reason: 'stale' });
    expect(xOf('elk-2', 'a')).toBe(999);
    expect(xOf('elk-2', 'c')).toBe(100);
  });
});
