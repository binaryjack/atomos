import { createSignal } from '@atomos-web/prime';
import type { Signal } from '@atomos-web/prime';
import type { EntityInstance } from './types/entity-instance.types.js';
import type { WorkspaceState } from './types/workspace-state.types.js';

export interface EntityRegistry {
  readonly workspaceState: Signal<WorkspaceState>;
  readonly registerEntity: (entity: EntityInstance) => void;
  readonly unregisterEntity: (entityId: string) => void;
}

export const createEntityRegistry = function(
  contentRoot: SVGElement
): EntityRegistry {
  const workspaceState = createSignal<WorkspaceState>({
    entities: new Map(),
    selectedEntityId: undefined,
    linkCreationInProgress: false,
    cursorPosition: { x: 0, y: 0 }
  });

  const registerEntity = (entity: EntityInstance): void => {
    // Idempotency guard: if the EventBus chain already pre-registered this entity
    // (via reconcile → reannounceEntity → EntityCreated handler) before the factory
    // caller's registerEntity() fires, silently skip to avoid a duplicate DOM tree.
    if (workspaceState.value.entities.has(entity.id)) return;
    const newEntities = new Map(workspaceState.value.entities);
    newEntities.set(entity.id, entity);
    workspaceState.set({ ...workspaceState.value, entities: newEntities });
    contentRoot.appendChild(entity.element);
  };

  const unregisterEntity = (entityId: string): void => {
    const entity = workspaceState.value.entities.get(entityId);
    if (!entity) return;
    if (entity.element.parentNode) entity.element.parentNode.removeChild(entity.element);
    entity.cleanup();
    const newEntities = new Map(workspaceState.value.entities);
    newEntities.delete(entityId);
    workspaceState.set({
      ...workspaceState.value,
      entities: newEntities,
      selectedEntityId: workspaceState.value.selectedEntityId === entityId
        ? undefined
        : workspaceState.value.selectedEntityId
    });
  };

  return { workspaceState, registerEntity, unregisterEntity };
};
