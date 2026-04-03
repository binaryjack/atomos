import type { LinkCreationState } from './link-creation-state.types.js';
import type { EntityState } from './entity-state.types.js';

export interface BehaviorState {
  readonly linkCreation: LinkCreationState;
  readonly entity: EntityState;
  readonly activeEntityId?: string | undefined;
  readonly sourceAnchorId?: string | undefined;
  readonly targetPosition?: { x: number; y: number } | undefined;
}
