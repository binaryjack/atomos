import { createSignal } from '@atomos-web/prime';
import type { Signal } from '@atomos-web/prime';
import type { LinkCreationState } from './types/link-creation-state.types.js';
import type { EntityState } from './types/entity-state.types.js';
import type { InteractionContext } from './types/interaction-context.types.js';
import type { BehaviorState } from './types/behavior-state.types.js';
import type { InteractiveBehaviorManager } from './types/interactive-behavior-manager.types.js';

export type { LinkCreationState, EntityState, InteractionContext, BehaviorState, InteractiveBehaviorManager };

export const createInteractiveBehaviorManager = function(): InteractiveBehaviorManager {
  const cleanupFunctions: Array<() => void> = [];
  
  // Core behavior state
  const behaviorState = createSignal<BehaviorState>({
    linkCreation: 'idle',
    entity: 'idle'
  });
  cleanupFunctions.push(() => behaviorState.subscribe(() => {})());

  // Link creation workflow
  const startLinkCreation = (context: InteractionContext) => {
    behaviorState.set({
      ...behaviorState.value,
      linkCreation: 'drawing',
      entity: 'idle',
      activeEntityId: context.entityId,
      sourceAnchorId: context.anchorId,
      targetPosition: context.position
    });
  };

  const updateLinkDrawing = (position: { x: number; y: number }) => {
    if (behaviorState.value.linkCreation === 'drawing') {
      behaviorState.set({
        ...behaviorState.value,
        targetPosition: position
      });
    }
  };

  const cancelLinkCreation = () => {
    behaviorState.set({
      linkCreation: 'idle',
      entity: 'idle',
      activeEntityId: undefined,
      sourceAnchorId: undefined,
      targetPosition: undefined
    });
  };

  // Entity interaction workflow  
  const selectEntity = (entityId: string) => {
    behaviorState.set({
      ...behaviorState.value,
      entity: 'selected',
      activeEntityId: entityId
    });
  };

  const startEntityDrag = (entityId: string, position: { x: number; y: number }) => {
    behaviorState.set({
      ...behaviorState.value,
      entity: 'dragging',
      activeEntityId: entityId,
      targetPosition: position
    });
  };

  const updateEntityDrag = (position: { x: number; y: number }) => {
    if (behaviorState.value.entity === 'dragging') {
      behaviorState.set({
        ...behaviorState.value,
        targetPosition: position
      });
    }
  };

  const endEntityDrag = () => {
    behaviorState.set({
      ...behaviorState.value,
      entity: 'selected',
      targetPosition: undefined
    });
  };

  const startEntityResize = (entityId: string, position: { x: number; y: number }) => {
    behaviorState.set({
      ...behaviorState.value,
      entity: 'resizing',
      activeEntityId: entityId,
      targetPosition: position
    });
  };

  const updateEntityResize = (position: { x: number; y: number }) => {
    if (behaviorState.value.entity === 'resizing') {
      behaviorState.set({
        ...behaviorState.value,
        targetPosition: position
      });
    }
  };

  const endEntityResize = () => {
    behaviorState.set({
      ...behaviorState.value,
      entity: 'selected',
      targetPosition: undefined
    });
  };

  // ESC key handling for cancellation
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const state = behaviorState.value;
      if (state.linkCreation === 'drawing') {
        cancelLinkCreation();
      } else if (state.entity === 'dragging' || state.entity === 'resizing') {
        behaviorState.set({
          linkCreation: 'idle',
          entity: 'idle',
          activeEntityId: undefined,
          sourceAnchorId: undefined,
          targetPosition: undefined
        });
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  cleanupFunctions.push(() => document.removeEventListener('keydown', handleKeyDown));

  return {
    behaviorState,
    startLinkCreation,
    updateLinkDrawing,
    cancelLinkCreation,
    selectEntity,
    startEntityDrag,
    updateEntityDrag,
    endEntityDrag,
    startEntityResize,
    updateEntityResize,
    endEntityResize,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};