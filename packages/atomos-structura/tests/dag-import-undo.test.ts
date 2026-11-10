// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { deserializeDAG } from '../src/shared/core/application/dag-service.js';
import { getInstanceReduxStore } from '../src/shared/core/create-redux-store.js';
import { createStoreHistory } from '../src/shared/core/store/create-store-history.js';
import { getEntityManager } from '../src/shared/core/presentation/entity-manager.js';
import { getActiveSchema } from '../src/shared/workflow-canvas/connection-graph.js';

const node = (id: string, x: number) => ({
  id, name: id, properties: [], position: { x, y: 0 }, dimensions: { width: 160, height: 80 }, createdAt: 0, updatedAt: 0,
  nodeType: 'task', ports: [{ id: 'in', direction: 'in', dataType: 'any' }, { id: 'out', direction: 'out', dataType: 'any' }],
});
const edge = (id: string, from: string, to: string) => ({
  id, sourceAnchorId: `${from}::out`, targetAnchorId: `${to}::in`, sourceEntityId: from, targetEntityId: to, createdAt: 0, updatedAt: 0,
});
const dag = JSON.stringify({
  type: 'DAGExchange', version: '1.0.0',
  nodes: [node('c', 0), node('b', 0), node('a', 0)],
  edges: [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')],
});

describe('DAG import with auto-layout', () => {
  it('is one undo step including the asynchronous ELK layout', async () => {
    const instanceId = 'dag-undo';
    const store = getInstanceReduxStore(instanceId, { persistence: false });
    const manager = getEntityManager(instanceId);
    manager.createEntity('old', 'Old', { x: 5, y: 5 }, { width: 100, height: 50 });
    await deserializeDAG(manager, dag, true);
    const entities = getActiveSchema(store.get_state())?.entities ?? [];
    const x = (id: string) => entities.find(e => e.id === id)?.position.x ?? NaN;
    expect(entities.map(e => e.id).sort()).toEqual(['a', 'b', 'c']);
    expect(x('a')).toBeLessThan(x('b'));
    expect(x('b')).toBeLessThan(x('c'));
    expect(store.undoLabel?.()).toBe('Import DAG');
    store.undo();
    expect(getActiveSchema(store.get_state())?.entities.map(e => e.id)).toEqual(['old']);
  });

  it('only amends the entry when it is still the latest step', () => {
    const stale = createStoreHistory<string>(10);
    stale.onChange('s0', true);
    const oldHead = stale.head();
    stale.onChange('s1', true);
    stale.begin('late layout', 's2', oldHead);
    stale.onChange('s2', true);
    stale.end('s3');
    expect(stale.undo('s3')).toBe('s2');

    const fresh = createStoreHistory<string>(10);
    fresh.onChange('s0', true);
    fresh.begin('layout', 's1', fresh.head());
    fresh.onChange('s1', true);
    fresh.end('s2');
    expect(fresh.undo('s2')).toBe('s0');
    expect(fresh.canUndo()).toBe(false);
  });
});
