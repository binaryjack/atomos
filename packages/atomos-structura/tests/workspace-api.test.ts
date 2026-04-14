/**
 * Battle tests — Redux store + WorkspaceApi
 * 
 * localStorage is mocked in-memory so these run in pure Node.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_redux_store } from '../src/core/create-redux-store.js';
import { createWorkspaceApi } from '../src/core/create-workspace-api.js';
import type { Entity } from '@atomos-web/structura-core';
import type { AppSettings } from '../src/features/settings-page/types/settings-page.types.js';

// ── localStorage mock ──────────────────────────────────────────────────────
const makeLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
};
vi.stubGlobal('localStorage', makeLocalStorage());

// ── Fixtures ───────────────────────────────────────────────────────────────
const makeEntity = (id: string, name = id): Entity => ({
  id,
  name,
  properties: [],
  position: { x: 0, y: 0 },
  dimensions: { width: 120, height: 60 },
  edges: [],
});

const makeSettings = (): AppSettings => ({
  toolbox: { sections: [] } as AppSettings['toolbox'],
  shapes: [],
  general: { gridSize: 20, enableSnapping: true },
});

// ── Helpers ────────────────────────────────────────────────────────────────
const getActiveCanvas = (store: ReturnType<typeof create_redux_store>) => {
  const st = store.get_state();
  return st.workspace.canvases[st.workspace.active_canvas_id];
};

// ── Redux store tests ──────────────────────────────────────────────────────
describe('create_redux_store', () => {
  beforeEach(() => {
    (localStorage as ReturnType<typeof makeLocalStorage>).clear();
  });

  it('initialises with schema-default', () => {
    const store = create_redux_store();
    const canvas = getActiveCanvas(store);
    expect(canvas?.active_schema_id).toBe('schema-default');
    expect(canvas?.schemas['schema-default']).toBeDefined();
  });

  it('adds an entity', () => {
    const store = create_redux_store();
    const e = makeEntity('e1', 'User');
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: e });
    const entities = getActiveCanvas(store)?.schemas['schema-default']?.entities ?? [];
    expect(entities).toHaveLength(1);
    expect(entities[0]?.id).toBe('e1');
  });

  it('updates an entity', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1', 'Old') });
    store.dispatch({ type: 'entity-updated', schema_id: 'schema-default', entity: makeEntity('e1', 'New') });
    const e = getActiveCanvas(store)?.schemas['schema-default']?.entities[0];
    expect(e?.name).toBe('New');
  });

  it('removes an entity', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    store.dispatch({ type: 'entity-removed', schema_id: 'schema-default', entity_id: 'e1' });
    expect(getActiveCanvas(store)?.schemas['schema-default']?.entities).toHaveLength(0);
  });

  it('moves an entity', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    store.dispatch({ type: 'entity-moved', schema_id: 'schema-default', entity_id: 'e1', x: 100, y: 200 });
    const e = getActiveCanvas(store)?.schemas['schema-default']?.entities[0];
    expect(e?.position).toEqual({ x: 100, y: 200 });
  });

  it('creates a link', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e2') });
    store.dispatch({ type: 'link-created', schema_id: 'schema-default', link_id: 'l1', from_id: 'e1', to_id: 'e2' });
    expect(getActiveCanvas(store)?.schemas['schema-default']?.links).toHaveLength(1);
  });

  it('removes a link', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e2') });
    store.dispatch({ type: 'link-created', schema_id: 'schema-default', link_id: 'l1', from_id: 'e1', to_id: 'e2' });
    store.dispatch({ type: 'link-removed', schema_id: 'schema-default', link_id: 'l1' });
    expect(getActiveCanvas(store)?.schemas['schema-default']?.links).toHaveLength(0);
  });

  it('creates a schema tab', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'schema-created', id: 'schema-2', name: 'Orders' });
    const canvas = getActiveCanvas(store);
    expect(canvas?.schemas['schema-2']).toBeDefined();
    expect(canvas?.schemas['schema-2']?.name).toBe('Orders');
  });

  it('renames a schema tab', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'schema-created', id: 'schema-2', name: 'Orders' });
    store.dispatch({ type: 'schema-renamed', id: 'schema-2', name: 'Billing' });
    expect(getActiveCanvas(store)?.schemas['schema-2']?.name).toBe('Billing');
  });

  it('deletes a schema tab (not active)', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'schema-created', id: 'schema-2', name: 'Orders' });
    // switch back to default so schema-2 is not active
    store.dispatch({ type: 'schema-activated', id: 'schema-default' });
    store.dispatch({ type: 'schema-deleted', id: 'schema-2' });
    expect(getActiveCanvas(store)?.schemas['schema-2']).toBeUndefined();
  });

  it('activates a schema tab', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'schema-created', id: 'schema-2', name: 'Orders' });
    store.dispatch({ type: 'schema-activated', id: 'schema-2' });
    expect(getActiveCanvas(store)?.active_schema_id).toBe('schema-2');
  });

  it('saves and loads settings', () => {
    const store = create_redux_store();
    const s = makeSettings();
    store.dispatch({ type: 'settings-updated', settings: s });
    expect(store.get_state().workspace.settings?.general?.gridSize).toBe(20);
  });

  it('replaces entire state via state-loaded', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    expect(getActiveCanvas(store)?.schemas['schema-default']?.entities).toHaveLength(1);
    // Load an explicit clean state with no entities
    store.dispatch({
      type: 'state-loaded',
      state: {
        workspace: {
          name: 'Untitled Workspace',
          version: '1',
          last_modified: new Date().toISOString(),
          canvases: {
            'canvas-default': {
              id: 'canvas-default',
              name: 'Canvas 1',
              schemas: { 'schema-default': { id: 'schema-default', name: 'Default Schema', entities: [], links: [] } },
              active_schema_id: 'schema-default',
              viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
            },
          },
          active_canvas_id: 'canvas-default',
        },
      },
    });
    expect(getActiveCanvas(store)?.schemas['schema-default']?.entities).toHaveLength(0);
  });

  it('notifies subscribers on dispatch', () => {
    const store = create_redux_store();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('unsubscribes correctly', () => {
    const store = create_redux_store();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    unsub();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    expect(listener).not.toHaveBeenCalled();
  });

  it('undo/redo reverts and replays entity addition', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    expect(store.can_undo()).toBe(true);
    store.undo();
    expect(getActiveCanvas(store)?.schemas['schema-default']?.entities).toHaveLength(0);
    expect(store.can_redo()).toBe(true);
    store.redo();
    expect(getActiveCanvas(store)?.schemas['schema-default']?.entities).toHaveLength(1);
  });

  it('viewport-updated does NOT push undo history', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'viewport-updated', viewport: { pan: { x: 100, y: 0 }, zoom: 1.5 } });
    expect(store.can_undo()).toBe(false);
  });

  it('reconcile() dispatches without polluting undo history', () => {
    const store = create_redux_store();
    store.reconcile(() => {
      store.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    });
    expect(store.can_undo()).toBe(false);
  });

  // ── Canvas-level tests ──
  it('creates a canvas and switches to it', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'canvas-created', id: 'canvas-2', name: 'Diagram 2' });
    expect(store.get_state().workspace.active_canvas_id).toBe('canvas-2');
    expect(store.get_state().workspace.canvases['canvas-2']?.name).toBe('Diagram 2');
  });

  it('renames a canvas', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'canvas-created', id: 'canvas-2', name: 'Old Name' });
    store.dispatch({ type: 'canvas-renamed', id: 'canvas-2', name: 'New Name' });
    expect(store.get_state().workspace.canvases['canvas-2']?.name).toBe('New Name');
  });

  it('deletes a canvas and switches active', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'canvas-created', id: 'canvas-2', name: 'Temp' });
    store.dispatch({ type: 'canvas-deleted', id: 'canvas-2' });
    expect(store.get_state().workspace.canvases['canvas-2']).toBeUndefined();
    expect(store.get_state().workspace.active_canvas_id).toBe('canvas-default');
  });

  it('activates a canvas', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'canvas-created', id: 'canvas-2', name: 'C2' });
    store.dispatch({ type: 'canvas-activated', id: 'canvas-default' });
    expect(store.get_state().workspace.active_canvas_id).toBe('canvas-default');
  });

  it('canvas-activated does NOT push undo history', () => {
    const store = create_redux_store();
    store.dispatch({ type: 'canvas-created', id: 'canvas-2', name: 'C2' });
    store.dispatch({ type: 'canvas-activated', id: 'canvas-default' });
    // Only canvas-created (undoable) is in history; canvas-activated is SKIP_HISTORY
    const undoCount = store.can_undo() ? 1 : 0;
    store.undo();
    // After undo, canvas-2 should disappear (canvas-created was undone)
    expect(store.get_state().workspace.canvases['canvas-2']).toBeUndefined();
    expect(undoCount).toBe(1);
  });
});

// ── WorkspaceApi tests ─────────────────────────────────────────────────────
describe('createWorkspaceApi', () => {
  beforeEach(() => {
    (localStorage as ReturnType<typeof makeLocalStorage>).clear();
  });

  it('getSettings() returns undefined initially', () => {
    const api = createWorkspaceApi(create_redux_store());
    expect(api.getSettings()).toBeUndefined();
  });

  it('setSettings() / getSettings() roundtrip', () => {
    const api = createWorkspaceApi(create_redux_store());
    api.setSettings(makeSettings());
    expect(api.getSettings()?.general?.gridSize).toBe(20);
  });

  it('saveWorkspace() / loadWorkspace() roundtrip', () => {
    const api = createWorkspaceApi(create_redux_store());
    const store2 = create_redux_store();
    store2.dispatch({ type: 'entity-added', schema_id: 'schema-default', entity: makeEntity('e1') });
    const saved = createWorkspaceApi(store2).saveWorkspace();
    api.loadWorkspace(saved);
    expect(api.listSchemas()[0]?.entityCount).toBe(1);
  });

  it('loadWorkspace() throws on invalid JSON', () => {
    const api = createWorkspaceApi(create_redux_store());
    expect(() => api.loadWorkspace('NOT_JSON')).toThrow();
  });

  it('listSchemas() returns default schema', () => {
    const api = createWorkspaceApi(create_redux_store());
    const list = api.listSchemas();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('schema-default');
  });

  it('createSchema() returns id and appears in listSchemas()', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createSchema('Orders');
    expect(id).toBeTruthy();
    const list = api.listSchemas();
    expect(list.some(s => s.id === id && s.name === 'Orders')).toBe(true);
  });

  it('renameSchema() updates name', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createSchema('Draft');
    api.renameSchema(id, 'Final');
    const info = api.listSchemas().find(s => s.id === id);
    expect(info?.name).toBe('Final');
  });

  it('deleteSchema() removes it', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createSchema('Temp');
    // activate default first so Temp can be deleted
    api.activateSchema('schema-default');
    api.deleteSchema(id);
    expect(api.listSchemas().some(s => s.id === id)).toBe(false);
  });

  it('activateSchema() + getActiveSchemaId() work', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createSchema('New');
    api.activateSchema(id);
    expect(api.getActiveSchemaId()).toBe(id);
  });

  it('listCanvases() returns default canvas', () => {
    const api = createWorkspaceApi(create_redux_store());
    const list = api.listCanvases();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('canvas-default');
  });

  it('createCanvas() creates and activates new canvas', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createCanvas('Board 2');
    expect(id).toBeTruthy();
    expect(api.getActiveCanvasId()).toBe(id);
    expect(api.listCanvases().some(c => c.id === id && c.name === 'Board 2')).toBe(true);
  });

  it('renameCanvas() updates canvas name', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createCanvas('Old');
    api.renameCanvas(id, 'New');
    expect(api.listCanvases().find(c => c.id === id)?.name).toBe('New');
  });

  it('deleteCanvas() removes canvas', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createCanvas('Temp');
    api.activateCanvas('canvas-default');
    api.deleteCanvas(id);
    expect(api.listCanvases().some(c => c.id === id)).toBe(false);
  });

  it('activateCanvas() switches active canvas', () => {
    const api = createWorkspaceApi(create_redux_store());
    const id = api.createCanvas('Board 2');
    api.activateCanvas('canvas-default');
    expect(api.getActiveCanvasId()).toBe('canvas-default');
    api.activateCanvas(id);
    expect(api.getActiveCanvasId()).toBe(id);
  });

  it('subscribe() fires on each mutation', () => {
    const store = create_redux_store();
    const api = createWorkspaceApi(store);
    const listener = vi.fn();
    const unsub = api.subscribe(listener);
    api.createSchema('X');
    api.setSettings(makeSettings());
    unsub();
    api.createSchema('Y'); // should NOT fire
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

