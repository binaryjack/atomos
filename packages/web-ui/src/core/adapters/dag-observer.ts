import type { DAGExport } from '../application/dag-service.js';
import type { EntityManager } from '../presentation/entity-manager.js';

export type DAGSubscriber = (dag: DAGExport) => void;

export interface DAGObserver {
  /**
   * Subscribe to real-time DAG topological changes.
   * Returns an unsubscribe function.
   */
  readonly subscribe: (callback: DAGSubscriber) => () => void;
  
  /**
   * Synchronously compute and fetch the current DAG topology
   */
  readonly getCurrentDAG: () => DAGExport;
  
  /**
   * Free memory and detach from the event bus
   */
  readonly cleanup: () => void;
}

/**
 * Creates an observer for the DAG graph that external frameworks (React/Vue)
 * can subscribe to without depending directly on the Canvas or UI layer.
 * 
 * Implements a throttle (requestAnimationFrame) to prevent consumer flooding.
 */
export const createDAGObserver = function(entityManager: EntityManager): DAGObserver {
  const subscribers = new Set<DAGSubscriber>();
  
  let animationFrameId: number | null = null;
  let currentDAG: DAGExport | null = null;

  const getDAG = (): DAGExport => {
    if (!currentDAG) {
      currentDAG = {
        version: '1.0.0',
        nodes: entityManager.getAllEntities(),
        edges: entityManager.getAllLinks(),
      };
    }
    return currentDAG;
  };

  const scheduleUpdate = () => {
    if (animationFrameId !== null) return;

    // Use setTimeout instead of requestAnimationFrame so updates fire even
    // when the tab is in the background or the browser throttles rAF.
    animationFrameId = window.setTimeout(() => {  // number in DOM; clearTimeout in cleanup
      animationFrameId = null;
      currentDAG = null; // invalidate cache
      const newDAG = getDAG();

      subscribers.forEach(sub => {
        try {
          sub(newDAG);
        } catch (err) {
          console.error('[dag-observer] Subscriber error:', err);
        }
      });
    }, 0);
  };

  const unsubscribe = entityManager.onApplicationEvent(event => {
    if (
      event.type === 'EntityCreated' ||
      event.type === 'EntityRemoved' ||
      event.type === 'EntityNameUpdated' ||
      event.type === 'EntityMetadataUpdated' ||
      event.type === 'EntityPropertiesUpdated' ||
      event.type === 'LinkCreated' ||
      event.type === 'LinkRemoved' ||
      event.type === 'LinkPropertiesUpdated'
    ) {
      scheduleUpdate();
    }
  });

  return {
    getCurrentDAG: getDAG,
    subscribe: (callback: DAGSubscriber) => {
      subscribers.add(callback);
      // Synchronous immediate first push for UI mounting
      callback(getDAG());
      return () => {
        subscribers.delete(callback);
      };
    },
    cleanup: () => {
      unsubscribe();
      subscribers.clear();
      if (animationFrameId !== null) {
        clearTimeout(animationFrameId);
        animationFrameId = null;
      }
    }
  };
};
