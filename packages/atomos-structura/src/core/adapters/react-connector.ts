import { getGlobalReduxStore } from '../create-redux-store.js';
import type { ReduxState, ReduxAction } from '../../types/redux-state.types.js';

export type StructuraSelector<T> = (state: ReduxState) => T;

/**
 * A headless API adapter that allows React components to subscribe
 * to the Vanilla TypeScript VBE (Structura) engine updates via useSyncExternalStore.
 * 
 * @example
 * ```tsx
 * import { useSyncExternalStore } from 'react';
 * import { structuraStoreAdapter } from '@atomos-web/structura/adapters';
 * 
 * const useStructuraState = <T>(selector: (state: ReduxState) => T) => {
 *   return useSyncExternalStore(
 *     structuraStoreAdapter.subscribe,
 *     () => selector(structuraStoreAdapter.getState())
 *   );
 * };
 * ```
 */
export const structuraStoreAdapter = {
  subscribe: (listener: () => void): (() => void) => {
    const store = getGlobalReduxStore();
    return store.subscribe(listener);
  },
  getState: (): ReduxState => {
    return getGlobalReduxStore().get_state();
  },
  dispatch: (action: ReduxAction): void => {
    getGlobalReduxStore().dispatch(action);
  }
};
