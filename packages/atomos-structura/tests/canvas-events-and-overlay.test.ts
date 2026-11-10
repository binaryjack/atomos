// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { Entity } from '@atomos-web/structura-core';
import { createStoreEventBridge } from '../src/features/workflow-canvas/create-store-event-bridge.js';
import { create_redux_store } from '../src/shared/core/create-redux-store.js';
import { createTypedEmitter } from '../src/shared/lib/create-typed-emitter.js';
import type { CanvasEventMap } from '../src/shared/workflow-canvas/canvas-events.types.js';
import { createOverlayStore } from '../src/shared/workflow-canvas/overlay-store.js';
import { createSelectionModel } from '../src/shared/workflow-canvas/selection-model.js';

const entity = (id: string, config: Record<string, unknown> = {}): Entity => ({
  id, code: id, name: id, createdAt: 0, updatedAt: 0, properties: [], position: { x: 0, y: 0 },
  dimensions: { width: 100, height: 60 }, edges: [], nodeType: 'task', config,
});

const setup = (instanceId: string) => {
  const store = create_redux_store({ instanceId, config: { persistence: false } });
  const events = createTypedEmitter<CanvasEventMap>();
  const stop = createStoreEventBridge(store, events);
  return { store, events, stop };
};

describe('typed canvas events', () => {
  it('emits node/edge lifecycle, config changes and change revisions', () => {
    const { store, events } = setup('events-1');
    const seen: string[] = [];
    (['node:added', 'node:removed', 'node:config-changed', 'edge:added', 'edge:removed', 'change'] as const)
      .forEach(name => events.on(name, () => seen.push(name)));
    const configChanged = vi.fn();
    events.on('node:config-changed', configChanged);
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('a') });
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('b') });
    store.dispatch({ type: 'link-created', schema_id: 'schema-default', link_id: 'l', from_id: 'a', to_id: 'b', from_anchor: 'a::out', to_anchor: 'b::in' });
    store.dispatch({ type: 'entity-updated', schema_id: 'schema-default', entity: entity('a', { retries: 2 }) });
    store.dispatch({ type: 'entity-removed', schema_id: 'schema-default', entity_id: 'b' });
    expect(seen).toEqual([
      'node:added', 'change', 'node:added', 'change', 'edge:added', 'change',
      'node:config-changed', 'change', 'node:removed', 'edge:removed', 'change',
    ]);
    expect(configChanged).toHaveBeenCalledWith({ nodeId: 'a', config: { retries: 2 }, previous: {} });
  });

  it('stops emitting after unsubscribe / bridge teardown', () => {
    const { store, events, stop } = setup('events-2');
    const handler = vi.fn();
    const off = events.on('node:added', handler);
    off();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('a') });
    expect(handler).not.toHaveBeenCalled();
    const change = vi.fn();
    events.on('change', change);
    stop();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('b') });
    expect(change).not.toHaveBeenCalled();
  });

  it('reports selection changes only when membership changes', () => {
    const selection = createSelectionModel();
    const listener = vi.fn();
    selection.subscribe(listener);
    selection.set(['a', 'b']);
    selection.set(['b', 'a']);
    selection.toggle('a');
    expect(listener).toHaveBeenNthCalledWith(1, ['a', 'b']);
    expect(listener).toHaveBeenNthCalledWith(2, ['b']);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('runtime overlay', () => {
  it('never touches the document or the undo history', () => {
    const { store } = setup('overlay-1');
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('a') });
    const before = store.get_state();
    const undoable = store.can_undo();
    const overlay = createOverlayStore();
    overlay.setNodeState('a', { status: 'running', label: 'step 2/5', progress: 1.7 });
    overlay.setEdgeState('l', { active: true });
    overlay.clear();
    expect(store.get_state()).toBe(before);
    expect(store.can_undo()).toBe(undoable);
  });

  it('normalizes and publishes node states', () => {
    const overlay = createOverlayStore();
    const changes = vi.fn();
    overlay.subscribe(changes);
    overlay.setNodeState('a', { status: 'running', progress: 1.7 });
    expect(overlay.getNodeState('a')).toEqual({ status: 'running', progress: 1 });
    expect(() => overlay.setNodeState('a', { status: 'exploded' as never })).toThrow(/Unknown node status/);
    overlay.clearNode('a');
    expect(overlay.getNodeState('a')).toBeUndefined();
    expect(changes).toHaveBeenLastCalledWith({ kind: 'node', id: 'a', state: undefined });
  });
});
