import type { Signal } from './signal.types.js';
import type { BehaviorState } from './behavior-state.types.js';
import type { InteractionContext } from './interaction-context.types.js';

export interface InteractiveBehaviorManager {
  readonly behaviorState: Signal<BehaviorState>;
  readonly startLinkCreation: (context: InteractionContext) => void;
  readonly updateLinkDrawing: (position: { x: number; y: number }) => void;
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
