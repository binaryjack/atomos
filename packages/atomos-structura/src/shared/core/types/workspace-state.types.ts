import type { EntityInstance } from './entity-instance.types.js';

export interface WorkspaceState {
  readonly entities: Map<string, EntityInstance>;
  readonly selectedEntityId?: string | undefined;
  readonly multiSelection?: readonly string[];
  readonly linkCreationInProgress: boolean;
  readonly cursorPosition: { x: number; y: number };
}
