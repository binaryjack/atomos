import type { DAGExport } from '../application/dag-service.js';
import type { DAGObserver } from './dag-observer.js';

// We define minimal React types manually to avoid creating an active
// dependency on 'react' in the web-ui package. Consumers cast to their React import.
type UseSyncExternalStore = <Snapshot>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot?: () => Snapshot
) => Snapshot;

export interface DAGReactHookAdapter {
  readonly useDAG: () => DAGExport;
}

/**
 * Creates a React Custom Hook bound to the Canvas DAG event loop.
 * Expects the consumer to pass in `useSyncExternalStore` from React directly.
 * 
 * Example usage in a React Host App:
 * ```tsx
 * import { useSyncExternalStore } from 'react';
 * import { createReactDAGHook } from '@atomos/prime';
 * 
 * const { useDAG } = createReactDAGHook(dagObserver, useSyncExternalStore);
 * 
 * export const MySidePanel = () => {
 *   const dag = useDAG();
 *   return <div>Nodes: {dag.nodes.length}</div>
 * }
 * ```
 */export const createReactDAGHook = function(
  observer: DAGObserver,
  useSyncExternalStore: UseSyncExternalStore
): DAGReactHookAdapter {
  
  // We maintain a stable snapshot reference so React doesn't 
  // infinite-loop on deep equality checks. The observer creates new objects on updates.
  return {
    useDAG: () => {
      // subscribe proxy maps 'DAGSubscriber' (which receives dag) to void parameter needed by React
      const subscribeProxy = (onStoreChange: () => void) => {
        return observer.subscribe(() => {
          onStoreChange();
        });
      };

      const getSnapshot = () => observer.getCurrentDAG();

      return useSyncExternalStore(subscribeProxy, getSnapshot);
    }
  };
};
