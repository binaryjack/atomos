import type { ReduxAction, ReduxState } from '../../types/redux-state.types.js'
import { getInstanceReduxStore } from '../create-redux-store.js'

export type StructuraSelector<T> = (state: ReduxState) => T;

/**
 * A headless API adapter factory that allows React components to subscribe
 * to a specific Vanilla TypeScript VBE (Structura) instance's engine updates.
 * 
 * @example
 * ```tsx
 * import { useSyncExternalStore } from 'react';
 * import { createStructuraStoreAdapter } from '@atomos/structura/adapters';
 * 
 * const useStructuraState = <T>(instanceId: string, selector: (state: ReduxState) => T) => {
 *   const adapter = createStructuraStoreAdapter(instanceId);
 *   return useSyncExternalStore(
 *     adapter.subscribe,
 *     () => selector(adapter.getState())
 *   );
 * };
 * ```
 */
export const createStructuraStoreAdapter = (instanceId: string) => {
  if (!instanceId) throw new Error('createStructuraStoreAdapter requires a non-empty instanceId.');
  
  return {
    subscribe: (listener: () => void): (() => void) => {
      const store = getInstanceReduxStore(instanceId);
      return store.subscribe(listener);
    },
    getState: (): ReduxState => {
      return getInstanceReduxStore(instanceId).get_state();
    },
    dispatch: (action: ReduxAction): void => {
      getInstanceReduxStore(instanceId).dispatch(action);
    }
  };
};

/**
 * @deprecated v2.0.0. Use createStructuraStoreAdapter(instanceId) instead. 
 * This legacy adapter will be removed in a future version.
 */
export const structuraStoreAdapter = {
  subscribe: (listener: () => void): (() => void) => {
    throw new Error('structuraStoreAdapter is deprecated and non-functional. Use createStructuraStoreAdapter(instanceId).');
  },
  getState: (): ReduxState => {
    throw new Error('structuraStoreAdapter is deprecated and non-functional. Use createStructuraStoreAdapter(instanceId).');
  },
  dispatch: (action: ReduxAction): void => {
    throw new Error('structuraStoreAdapter is deprecated and non-functional. Use createStructuraStoreAdapter(instanceId).');
  }
};
