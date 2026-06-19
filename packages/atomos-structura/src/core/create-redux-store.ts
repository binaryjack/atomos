import type { Cardinality, LinkProps, RenderType, WorkspaceConfig } from '@atomos-web/structura-core'
import type { CanvasModel, ReduxAction, ReduxState, ReduxStore, SchemaModel } from '../types/redux-state.types.js'

const DEFAULT_CANVAS_ID = 'canvas-default';
const DEFAULT_SCHEMA_ID = 'schema-default';

const makeDefaultSchema = (id = DEFAULT_SCHEMA_ID, name = 'Default Schema'): SchemaModel => ({
  id, name, entities: [], links: [],
});

const makeDefaultCanvas = (id = DEFAULT_CANVAS_ID, name = 'Canvas 1'): CanvasModel => ({
  id,
  name,
  schemas: { [DEFAULT_SCHEMA_ID]: makeDefaultSchema() },
  active_schema_id: DEFAULT_SCHEMA_ID,
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
});

const make_initial_state = (config?: WorkspaceConfig): ReduxState => ({
  workspace: {
    name: 'Untitled Workspace',
    version: '1',
    last_modified: new Date().toISOString(),
    ...(config ? { config } : {}),
    canvases: { [DEFAULT_CANVAS_ID]: makeDefaultCanvas() },
    active_canvas_id: DEFAULT_CANVAS_ID,
  },
});

const initial_state: ReduxState = make_initial_state();

// ── State helpers ─────────────────────────────────────────────────────────────

const updateActiveCanvas = (state: ReduxState, fn: (canvas: CanvasModel) => CanvasModel): ReduxState => {
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  if (!canvas) return state;
  return {
    ...state,
    workspace: {
      ...state.workspace,
      last_modified: new Date().toISOString(),
      canvases: {
        ...state.workspace.canvases,
        [state.workspace.active_canvas_id]: fn(canvas),
      },
    },
  };
};

const updateSchemaInCanvas = (
  canvas: CanvasModel,
  schema_id: string,
  fn: (schema: SchemaModel) => SchemaModel,
): CanvasModel => {
  const schema = canvas.schemas[schema_id];
  if (!schema) return canvas;
  return { ...canvas, schemas: { ...canvas.schemas, [schema_id]: fn(schema) } };
};

const reduce_state = function(state: ReduxState, action: ReduxAction): ReduxState {
  
  switch (action.type) {

    case 'entity-moved': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const entities = schema.entities.map(e =>
            e.id === action.entity_id ? { ...e, position: { x: action.x, y: action.y } } : e
          );
          return { ...schema, entities };
        })
      );
    }

    case 'entity-resized': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const entities = schema.entities.map(e =>
            e.id === action.entity_id ? { ...e, dimensions: { width: action.width, height: action.height } } : e
          );
          return { ...schema, entities };
        })
      );
    }

    case 'entity-toggled-collapse': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const entities = schema.entities.map(e =>
            e.id === action.entity_id ? { ...e, collapsed: action.collapsed } : e
          );
          return { ...schema, entities };
        })
      );
    }

    case 'entity-updated': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const entities = schema.entities.map(e => e.id === action.entity.id ? action.entity : e);
          return { ...schema, entities };
        })
      );
    }

    case 'entity-added': {
      return updateActiveCanvas(state, canvas => {
        const schema = canvas.schemas[action.schema_id] ?? makeDefaultSchema(action.schema_id);
        const entities = [...schema.entities, action.entity];
        return {
          ...canvas,
          schemas: { ...canvas.schemas, [action.schema_id]: { ...schema, entities } },
        };
      });
    }

    case 'entity-removed': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const entities = schema.entities.filter(e => e.id !== action.entity_id);
          const links = schema.links.filter(l =>
            l.leftEntityId !== action.entity_id && l.rightEntityId !== action.entity_id
          );
          return { ...schema, entities, links };
        })
      );
    }

    case 'link-created': {
      return updateActiveCanvas(state, canvas => {
        const schema = canvas.schemas[action.schema_id] ?? makeDefaultSchema(action.schema_id);
        const link: LinkProps = {
          id: action.link_id || `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          leftEntityId: action.from_id,
          rightEntityId: action.to_id,
          leftAnchorId: action.from_anchor || 'center',
          rightAnchorId: action.to_anchor || 'center',
          leftCardinality: (action.leftCardinality || '1') as Cardinality,
          rightCardinality: (action.rightCardinality || '1') as Cardinality,
          ...(action.leftProperty ? { leftProperty: action.leftProperty } : {}),
          ...(action.rightProperty ? { rightProperty: action.rightProperty } : {}),
          ...(action.direction ? { direction: action.direction } : {}),
          renderType: (action.renderType as RenderType) || 'bezier',
        };
        const links = [...schema.links, link];
        return {
          ...canvas,
          schemas: { ...canvas.schemas, [action.schema_id]: { ...schema, links } },
        };
      });
    }

    case 'link-updated': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const links = schema.links.map(l => l.id === action.link.id ? { ...l, ...action.link } : l);
          return { ...schema, links };
        })
      );
    }

    case 'link-removed': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.schema_id, schema => {
          const links = schema.links.filter(l => l.id !== action.link_id);
          return { ...schema, links };
        })
      );
    }

    case 'viewport-updated': {
      return updateActiveCanvas(state, canvas => ({ ...canvas, viewport: action.viewport }));
    }

    case 'settings-updated': {
      return {
        ...state,
        workspace: { ...state.workspace, settings: action.settings, last_modified: new Date().toISOString() },
      };
    }

    case 'settings-toggled': {
      if (state.workspace.config?.headless) return state;
      return { ...state, is_settings_open: action.is_open };
    }

    case 'schema-create-auto': {
      // Standalone fallback: generate an ID here when no dispatch hook intercepted this.
      // When MCP is connected, a hook swallows this and the SSE delivers schema-created.
      if (state.workspace.config?.allow_multiple_schemas === false
        && Object.keys(state.workspace.canvases[state.workspace.active_canvas_id]?.schemas ?? {}).length >= 1
      ) return state;
      return updateActiveCanvas(state, canvas => {
        const autoId = `schema-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newSchema = makeDefaultSchema(autoId, action.name);
        return {
          ...canvas,
          schemas: { ...canvas.schemas, [autoId]: newSchema },
          active_schema_id: autoId,
        };
      });
    }

    case 'schema-created': {
      if (state.workspace.config?.allow_multiple_schemas === false
        && Object.keys(state.workspace.canvases[state.workspace.active_canvas_id]?.schemas ?? {}).length >= 1
      ) return state;
      return updateActiveCanvas(state, canvas => {
        if (canvas.schemas[action.id]) return canvas;
        const newSchema = makeDefaultSchema(action.id, action.name);
        return {
          ...canvas,
          schemas: { ...canvas.schemas, [action.id]: newSchema },
          active_schema_id: action.id,
        };
      });
    }

    case 'schema-renamed': {
      return updateActiveCanvas(state, canvas =>
        updateSchemaInCanvas(canvas, action.id, schema => ({ ...schema, name: action.name }))
      );
    }

    case 'schema-deleted': {
      return updateActiveCanvas(state, canvas => {
        const ids = Object.keys(canvas.schemas);
        if (ids.length <= 1) return canvas;
        const { [action.id]: _removed, ...remaining } = canvas.schemas;
        const next_active = canvas.active_schema_id === action.id
          ? (Object.keys(remaining)[0] ?? canvas.active_schema_id)
          : canvas.active_schema_id;
        return { ...canvas, schemas: remaining, active_schema_id: next_active };
      });
    }

    case 'schema-activated': {
      return updateActiveCanvas(state, canvas => {
        if (!canvas.schemas[action.id]) return canvas;
        return { ...canvas, active_schema_id: action.id };
      });
    }

    case 'canvas-created': {
      if (state.workspace.canvases[action.id]) return state;
      const newCanvas = makeDefaultCanvas(action.id, action.name);
      return {
        ...state,
        workspace: {
          ...state.workspace,
          last_modified: new Date().toISOString(),
          canvases: { ...state.workspace.canvases, [action.id]: newCanvas },
          active_canvas_id: action.id,
        },
      };
    }

    case 'canvas-renamed': {
      const canvasToRename = state.workspace.canvases[action.id];
      if (!canvasToRename) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          last_modified: new Date().toISOString(),
          canvases: { ...state.workspace.canvases, [action.id]: { ...canvasToRename, name: action.name } },
        },
      };
    }

    case 'canvas-deleted': {
      const canvasIds = Object.keys(state.workspace.canvases);
      if (canvasIds.length <= 1) return state;
      const { [action.id]: _removedCanvas, ...remainingCanvases } = state.workspace.canvases;
      const next_canvas = state.workspace.active_canvas_id === action.id
        ? (Object.keys(remainingCanvases)[0] ?? state.workspace.active_canvas_id)
        : state.workspace.active_canvas_id;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          last_modified: new Date().toISOString(),
          canvases: remainingCanvases,
          active_canvas_id: next_canvas,
        },
      };
    }

    case 'canvas-activated': {
      if (!state.workspace.canvases[action.id]) return state;
      return {
        ...state,
        workspace: { ...state.workspace, active_canvas_id: action.id },
      };
    }

    case 'canvas-appearance-updated': {
      const targetCanvas = state.workspace.canvases[action.canvas_id];
      if (!targetCanvas) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          last_modified: new Date().toISOString(),
          canvases: {
            ...state.workspace.canvases,
            [action.canvas_id]: { ...targetCanvas, appearance_override: action.appearance },
          },
        },
      };
    }

    case 'state-loaded': {
      return action.state;
    }

    case 'state-reset': {
      return make_initial_state(state.workspace.config);
    }

    default:
      return state;
  }
};

export const create_redux_store = function(options: { instanceId: string; config?: WorkspaceConfig }): ReduxStore {
  // BREAKING v2.0.0: instanceId is now REQUIRED
  const { instanceId, config } = options
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'create_redux_store({ instanceId, config? }) requires a non-empty instanceId. ' +
      'v2.0.0 breaks backward compatibility: instanceId is now mandatory for isolation guarantee.'
    )
  }
  let current_state = make_initial_state(config);
  const listeners = new Set<(state: ReduxState) => void>();

  // Undo/redo history — never persisted, only lives in memory
  const HISTORY_LIMIT = 50;
  const SKIP_HISTORY = new Set<ReduxAction['type']>([
    'viewport-updated', 'settings-toggled', 'settings-updated', 'state-loaded', 'state-reset',
    'canvas-activated', // switching canvases is not undoable
    'schema-create-auto', // intent-only; the resulting schema-created is the undoable state change
  ]);
  const history_past: ReduxState[] = [];
  const history_future: ReduxState[] = [];

  // Reconciliation mode — dispatches inside reconcile() don't affect undo/redo history
  let is_reconciling = false;

  const reduxStateKey = `${instanceId ? `${instanceId}:` : ''}vbe2:redux-state`;

  const persist = function(): void {
    if (current_state.workspace?.config?.disableLocalStorage) return;
    const serialized = JSON.stringify(current_state);
    try {
      localStorage.setItem(reduxStateKey, serialized);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        const keysToRemove: string[] = [];
        const prefix = instanceId ? `${instanceId}:vbe2:` : 'vbe2:';
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix) && key !== reduxStateKey) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        try { localStorage.setItem(reduxStateKey, serialized); } catch { /* quota still full */ }
      }
    }
  };

  const load = function(): void {
    if (config?.disableLocalStorage) {
      current_state = make_initial_state(config);
      return;
    }
    try {
      const raw = localStorage.getItem(reduxStateKey);
      if (raw) {
        const loaded_state = JSON.parse(raw) as ReduxState;
        
        // --- DEEP COERCION MIGRATION ---
        // Legacy data often stored numbers as strings, causing catastrophic
        // string concatenation during math (e.g. pan calculation jumping to infinity).
        if (loaded_state.workspace?.canvases) {
          Object.values(loaded_state.workspace.canvases).forEach(canvas => {
            // Coerce Viewport
            if (canvas.viewport) {
              const vp = canvas.viewport as any;
              let z = Number(vp.zoom);
              if (!Number.isFinite(z) || z <= 0) z = 1;
              let px = Number(vp.pan?.x ?? vp.panX) || 0;
              let py = Number(vp.pan?.y ?? vp.panY) || 0;
              
              // Clamp extreme viewport pan
              if (px < -20000 || px > 20000) px = 0;
              if (py < -20000 || py > 20000) py = 0;

              (canvas as any).viewport = {
                zoom: z,
                pan: { x: px, y: py }
              };
            }
            // Coerce Entities
            if (canvas.schemas) {
              Object.values(canvas.schemas).forEach(schema => {
                if (Array.isArray(schema.entities)) {
                  schema.entities.forEach(entity => {
                    if (entity.position) {
                      let ex = Number(entity.position.x) || 0;
                      let ey = Number(entity.position.y) || 0;
                      // Clamp extreme entity positions caused by legacy string bugs
                      if (ex < -10000 || ex > 10000) ex = 0;
                      if (ey < -10000 || ey > 10000) ey = 0;
                      (entity as any).position.x = ex;
                      (entity as any).position.y = ey;
                    }
                    if (entity.dimensions) {
                      (entity as any).dimensions.width = Number(entity.dimensions.width) || 200;
                      (entity as any).dimensions.height = Number(entity.dimensions.height) || 100;
                    }
                  });
                }
              });
            }
          });
        }
        
        current_state = loaded_state;
      }
    } catch (error) {
      console.error('❌ Failed to load Redux state:', error);
      current_state = make_initial_state(config);
    }
    // Validity check: incompatible format (old flat state or corrupt) → start fresh
    if (!current_state.workspace) {
      current_state = make_initial_state(config);
      return;
    }
    
    // Runtime config always wins over persisted config
    if (config !== undefined) {
      current_state = { ...current_state, workspace: { ...current_state.workspace, config } };
    }
    // Guarantee active canvas always has an entry
    if (!current_state.workspace.canvases[current_state.workspace.active_canvas_id]) {
      const fresh = makeDefaultCanvas();
      current_state = {
        ...current_state,
        workspace: {
          ...current_state.workspace,
          canvases: { ...current_state.workspace.canvases, [DEFAULT_CANVAS_ID]: fresh },
          active_canvas_id: DEFAULT_CANVAS_ID,
        },
      };
    }
  };

  const get_state = function(): ReduxState {
    return current_state;
  };

  const dispatch_hooks = new Set<(action: ReduxAction) => ReduxAction | null>();

  const addDispatchHook = function(hook: (action: ReduxAction) => ReduxAction | null): () => void {
    dispatch_hooks.add(hook);
    return () => dispatch_hooks.delete(hook);
  };

  const dispatch = function(action: ReduxAction): void {
    let finalAction: ReduxAction | null = action;
    for (const hook of dispatch_hooks) {
      finalAction = hook(finalAction!);
      if (!finalAction) return; // swallowed by hook
    }
    const previous_state = current_state;
    current_state = reduce_state(current_state, finalAction);

    if (current_state !== previous_state) {
      if (!is_reconciling && !SKIP_HISTORY.has(action.type)) {
        history_past.push(previous_state);
        if (history_past.length > HISTORY_LIMIT) history_past.shift();
        history_future.length = 0;
      }
      persist();
      listeners.forEach(listener => { try { listener(current_state); } catch (err) { console.error('[Redux] listener error:', err); } });
    }
  };

  const undo = function(): void {
    const prev = history_past.pop();
    if (!prev) return;
    history_future.push(current_state);
    current_state = prev;
    persist();
    listeners.forEach(listener => { try { listener(current_state); } catch (err) { console.error('[Redux] listener error:', err); } });
  };

  const redo = function(): void {
    const next = history_future.pop();
    if (!next) return;
    history_past.push(current_state);
    current_state = next;
    persist();
    listeners.forEach(listener => { try { listener(current_state); } catch (err) { console.error('[Redux] listener error:', err); } });
  };

  const can_undo = function(): boolean { return history_past.length > 0; };
  const can_redo = function(): boolean { return history_future.length > 0; };

  const reconcile = function(fn: () => void): void {
    is_reconciling = true;
    try { fn(); } finally { is_reconciling = false; }
  };

  const subscribe = function(listener: (state: ReduxState) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // Load initial state
  load();

  return { get_state, dispatch, subscribe, undo, redo, can_undo, can_redo, reconcile, addDispatchHook };
};

// ── Global store (legacy, for backward compatibility) ──────────────────────
let globalReduxStore: ReduxStore | null = null;

/** @deprecated v2.0.0: Use getInstanceReduxStore(instanceId) instead. Global store no longer supported. */
export const getGlobalReduxStore = function(config?: WorkspaceConfig, instanceId?: string): ReduxStore {
  throw new Error(
    'getGlobalReduxStore() has been removed in v2.0.0 for true multi-instance isolation. '
    + 'Use createInstanceReduxStore(config, instanceId) or getInstanceReduxStore(instanceId) instead.'
  )
};

/** Reset the global store — only for testing. */
export const resetGlobalReduxStore = function(): void {
  globalReduxStore = null;
};

// ── Per-instance store (NEW: for webview isolation) ────────────────────────
const instanceStores = new Map<string, ReduxStore>();

export const createInstanceReduxStore = function(config?: WorkspaceConfig, instanceId?: string): ReduxStore {
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error('createInstanceReduxStore requires a non-empty instanceId')
  }
  
  // Return existing if available
  const existing = instanceStores.get(instanceId);
  if (existing) return existing;

  const store = create_redux_store(config ? { instanceId, config } : { instanceId });
  instanceStores.set(instanceId, store);
  return store;
};

export const storeInstanceReduxStore = function(instanceId: string, store: ReduxStore): void {
  instanceStores.set(instanceId, store);
};

/**
 * Get or create a Redis store for a specific instance.
 * REQUIRED: instanceId must be provided. Throws if missing.
 */
export const getInstanceReduxStore = function(instanceId: string, config?: WorkspaceConfig): ReduxStore {
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'getInstanceReduxStore(instanceId, config) requires a non-empty instanceId. '
      + 'This is a breaking change in v2.0.0 to ensure true isolation.'
    )
  }
  if (!instanceStores.has(instanceId)) {
    instanceStores.set(instanceId, create_redux_store(config ? { instanceId, config } : { instanceId }))
  }
  return instanceStores.get(instanceId)!
};

export const destroyInstanceReduxStore = function(instanceId: string): void {
  instanceStores.delete(instanceId);
};
