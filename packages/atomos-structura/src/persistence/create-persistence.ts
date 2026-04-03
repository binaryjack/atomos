import type { CanvasState, Store } from '../types/store.types.js';

export const createPersistence = function(store: Store) {
  const STORAGE_KEY = 'vbs-canvas-state';

  const saveState = function(state: CanvasState) {
    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, serialized);
      console.log('State persisted to localStorage:', state);
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  };

  const loadState = function(): CanvasState | null {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        console.log('No persisted state found');
        return null;
      }
      
      const state = JSON.parse(serialized) as CanvasState;
      console.log('State loaded from localStorage:', state);
      return state;
    } catch (error) {
      console.error('Failed to load persisted state:', error);
      return null;
    }
  };

  const clearState = function() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Persisted state cleared');
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