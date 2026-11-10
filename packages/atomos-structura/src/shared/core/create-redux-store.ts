import type { WorkspaceConfig } from '@atomos-web/structura-core'
import type { ReduxAction, ReduxState, ReduxStore, TransactionOptions } from '../types/redux-state.types.js'
import { restorePersistedState } from '../workflow-document/model/persisted-state.js'
import { createStoreHistory, isPersistenceDisabled } from './store/create-store-history.js'
import { reduceWorkspaceState } from './store/reduce-workspace-actions.js'
import { DEFAULT_CANVAS_ID, makeDefaultCanvas, makeInitialReduxState } from './store/workspace-defaults.js'

const make_initial_state = makeInitialReduxState;
const reduce_state = reduceWorkspaceState;

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
  const history = createStoreHistory<ReduxState>(HISTORY_LIMIT);

  // Reconciliation mode — dispatches inside reconcile() don't affect undo/redo history
  let is_reconciling = false;

  const reduxStateKey = `${instanceId ? `${instanceId}:` : ''}vbe2:redux-state`;

  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistSync = function(): void {
    if (persistTimer !== null) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (isPersistenceDisabled(current_state.workspace?.config)) return;
    if (typeof localStorage === 'undefined') return;
    try {
      const serialized = JSON.stringify(current_state);
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
        try {
          const serialized = JSON.stringify(current_state);
          localStorage.setItem(reduxStateKey, serialized);
        } catch { /* quota still full */ }
      }
    }
  };

  const persist = function(immediate = false): void {
    if (isPersistenceDisabled(current_state.workspace?.config)) return;
    if (immediate) {
      persistSync();
      return;
    }
    if (persistTimer !== null) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistSync();
    }, 250);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (persistTimer !== null) {
        persistSync();
      }
    });
  }

  const readPersisted = function(): string | null {
    if (isPersistenceDisabled(config) || typeof localStorage === 'undefined' || !localStorage) return null;
    try { return localStorage.getItem(reduxStateKey); } catch { return null; }
  };

  const load = function(): void {
    current_state = make_initial_state(config);
    const raw = readPersisted();
    if (raw) {
      // Same validation + migration path as importDocument: accepted whole or rejected whole.
      const restored = restorePersistedState(raw);
      if (restored.ok) {
        current_state = restored.state;
      } else {
        console.error('[Structura] Persisted workspace rejected, starting fresh:', restored.errors);
        try { localStorage.setItem(`${reduxStateKey}:rejected-backup`, raw); } catch { /* quota full */ }
      }
    }
    current_state = { ...current_state, is_settings_open: false };
    
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
      history.onChange(previous_state, !is_reconciling && !SKIP_HISTORY.has(action.type));
      persist();
      listeners.forEach(listener => { try { listener(current_state); } catch (err) { console.error('[Redux] listener error:', err); } });
    }
  };

  const undoRedoListeners = new Set<(type: 'undo' | 'redo') => void>();

  const onUndoRedo = function(listener: (type: 'undo' | 'redo') => void): () => void {
    undoRedoListeners.add(listener);
    return () => undoRedoListeners.delete(listener);
  };

  const travel = function(kind: 'undo' | 'redo'): void {
    const target = kind === 'undo' ? history.undo(current_state) : history.redo(current_state);
    if (!target) return;
    current_state = target;
    persist(true);
    listeners.forEach(listener => { try { listener(current_state); } catch (err) { console.error('[Redux] listener error:', err); } });
    undoRedoListeners.forEach(listener => { try { listener(kind); } catch (err) { console.error('[Redux] onUndoRedo error:', err); } });
  };
  const undo = (): void => travel('undo');
  const redo = (): void => travel('redo');
  const can_undo = history.canUndo;
  const can_redo = history.canRedo;

  // Transactions: every undoable dispatch between begin/end is recorded as ONE undo step.
  const beginTransaction = (label: string, options?: TransactionOptions): void => history.begin(label, current_state, options?.amend);
  const endTransaction = (): void => history.end(current_state);
  const transaction = function<T>(label: string, fn: () => T, options?: TransactionOptions): T {
    beginTransaction(label, options);
    try { return fn(); } finally { endTransaction(); }
  };
  const undoLabel = history.undoLabel; const historyHead = history.head;

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

  return { get_state, dispatch, subscribe, undo, redo, can_undo, can_redo, reconcile, addDispatchHook, flushPersistence: persistSync, onUndoRedo, transaction, beginTransaction, endTransaction, undoLabel, historyHead };
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
  if (existing) {
    if (config !== undefined) {
      // Re-inject the new runtime config to ensure mode toggles (headless, readonly) are respected!
      const current = existing.get_state();
      existing.dispatch({
        type: 'state-loaded',
        state: {
          ...current,
          workspace: {
            ...current.workspace,
            config: {
              ...current.workspace.config,
              ...config
            }
          }
        }
      });
    }
    return existing;
  }

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
