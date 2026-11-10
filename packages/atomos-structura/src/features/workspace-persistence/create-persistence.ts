import type { CanvasState, Store } from '../../shared/types/store.types.js'

export const createPersistence = function(store: Store, instanceId: string) {
  // BREAKING v2.0.0: instanceId is now REQUIRED
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'createPersistence(store, instanceId) requires a non-empty instanceId. ' +
      'v2.0.0 breaks backward compatibility: instanceId is now mandatory for isolation.'
    )
  }
  const STORAGE_KEY = `${instanceId}:vbs-canvas-state`;

  const saveState = function(state: CanvasState) {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  };

  const loadState = function(): CanvasState | null {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return null;
      }
      
      const state = JSON.parse(serialized) as CanvasState;
      return state;
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      return null;
    }
  };

  const clearState = function() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
    }
  };

  // Auto-persist on state changes
  const unsubscribe = store.subscribe(saveState);

  // Load initial state
  const persistedState = loadState();
  if (persistedState) {
    store.dispatch({ type: 'canvas/load', payload: persistedState });
  }

  return {
    saveState,
    loadState,
    clearState,
    destroy: unsubscribe
  };
};