// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Entity } from '@atomos-web/structura-core';
import { create_redux_store } from '../src/shared/core/create-redux-store.js';
import { createMemoryStorage } from './support/recording-event-source.js';

const entity = (id: string, x = 0): Entity => ({
  id, code: id, name: id, createdAt: 0, updatedAt: 0, properties: [], position: { x, y: 0 }, dimensions: { width: 100, height: 60 }, edges: [],
});

const schemaOf = (store: ReturnType<typeof create_redux_store>) => {
  const state = store.get_state();
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  return canvas?.schemas[canvas.active_schema_id];
};

const newStore = (id: string) => create_redux_store({ instanceId: id, config: { persistence: false } });

afterEach(() => { vi.unstubAllGlobals(); });

describe('store transactions', () => {
  it('groups every dispatch inside transaction() into one undo step', () => {
    const store = newStore('tx-1');
    store.transaction('Add three', () => {
      ['a', 'b', 'c'].forEach(id => store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity(id) }));
    });
    expect(schemaOf(store)?.entities).toHaveLength(3);
    expect(store.undoLabel?.()).toBe('Add three');
    store.undo();
    expect(schemaOf(store)?.entities).toHaveLength(0);
    expect(store.can_undo()).toBe(false);
    store.redo();
    expect(schemaOf(store)?.entities).toHaveLength(3);
  });

  it('nests transactions and supports begin/end across async gestures', () => {
    const store = newStore('tx-2');
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('a') });
    store.beginTransaction('Drag');
    store.transaction('inner', () => store.dispatch({ type: 'entity-moved', schema_id: 'schema-default', entity_id: 'a', x: 10, y: 0 }));
    store.dispatch({ type: 'entity-moved', schema_id: 'schema-default', entity_id: 'a', x: 20, y: 0 });
    store.endTransaction();
    store.undo();
    expect(schemaOf(store)?.entities[0]?.position.x).toBe(0);
    store.undo();
    expect(schemaOf(store)?.entities).toHaveLength(0);
  });

  it('records nothing for a transaction without undoable changes', () => {
    const store = newStore('tx-3');
    store.transaction('viewport only', () => store.dispatch({ type: 'viewport-updated', viewport: { pan: { x: 5, y: 5 }, zoom: 2 } }));
    expect(store.can_undo()).toBe(false);
  });

  it('never touches localStorage when persistence is false', () => {
    const storage = { ...createMemoryStorage(), setItem: vi.fn(), getItem: vi.fn(() => null) };
    vi.stubGlobal('localStorage', storage);
    const store = create_redux_store({ instanceId: 'tx-4', config: { persistence: false } });
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: entity('a') });
    store.flushPersistence?.();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('validates persisted state on load and starts fresh (with a backup) when corrupt', () => {
    const storage = createMemoryStorage();
    storage.setItem('tx-5:vbe2:redux-state', '{"workspace":{"canvases":{"c":{"schemas":{"s":{"entities":[{"name":"no id"}]}}}}}}');
    vi.stubGlobal('localStorage', storage);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = create_redux_store({ instanceId: 'tx-5' });
    expect(schemaOf(store)?.entities).toHaveLength(0);
    expect(storage.getItem('tx-5:vbe2:redux-state:rejected-backup')).toContain('no id');
    expect(errors).toHaveBeenCalled();
  });
});
