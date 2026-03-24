import { createSignal } from './create-signal.js';
import type { Signal } from './types/signal.types.js';

// Behavior states for coordinating interactions
export type LinkCreationState = 'idle' | 'drawing' | 'connecting';
export type EntityState = 'idle' | 'selected' | 'dragging' | 'resizing';

export interface InteractionContext {
  readonly entityId: string;
  readonly anchorId?: string;
  readonly position: { x: number; y: number };
  readonly event: PointerEvent | MouseEvent;
}

export interface BehaviorState {
  readonly linkCreation: LinkCreationState;
  readonly entity: EntityState;
  readonly activeEntityId?: string | undefined;
  readonly sourceAnchorId?: string | undefined;
  readonly targetPosition?: { x: number; y: number } | undefined;
}

export interface InteractiveBehaviorManager {
  readonly behaviorState: Signal<BehaviorState>;
  readonly startLinkCreation: (context: InteractionContext) => void;
  readonly updateLinkDrawing: (position: { x: number; y: number }) => void;
  readonly completeLinkCreation: (targetContext?: InteractionContext) => void;
  readonly cancelLinkCreation: () => void;
  readonly selectEntity: (entityId: string) => void;
  readonly startEntityDrag: (entityId: string, position: { x: number; y: number }) => void;
  readonly updateEntityDrag: (position: { x: number; y: number }) => void;
  readonly endEntityDrag: () => void;
  readonly startEntityResize: (entityId: string, position: { x: number; y: number }) => void;
  readonly updateEntityResize: (position: { x: number; y: number }) => void;
  readonly endEntityResize: () => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

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

  const completeLinkCreation = (targetContext?: InteractionContext) => {
    const state = behaviorState.value;
    if (state.linkCreation === 'drawing') {
      if (targetContext?.anchorId) {
        // Connect to existing anchor
        behaviorState.set({
          ...state,
          linkCreation: 'connecting'
        });
        // Connection logic will be handled by LinkManager
        setTimeout(() => {
          behaviorState.set({
            linkCreation: 'idle',
            entity: 'idle',
            activeEntityId: undefined,
            sourceAnchorId: undefined,
            targetPosition: undefined
          });
        }, 100);
      } else if (targetContext?.position) {
        // Create new entity at position
        behaviorState.set({
          ...state,
          linkCreation: 'connecting',
          targetPosition: targetContext.position
        });
        // Entity creation logic will be handled by WorkspaceManager
        setTimeout(() => {
          behaviorState.set({
            linkCreation: 'idle',
            entity: 'idle',
            activeEntityId: undefined,
            sourceAnchorId: undefined,
            targetPosition: undefined
          });
        }, 100);
      } else {
        cancelLinkCreation();
      }
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
    completeLinkCreation,
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