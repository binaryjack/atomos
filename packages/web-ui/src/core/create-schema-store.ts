import type { Signal } from './types/signal.types.js';
import type { SchemaModel } from './types/schema-model.types.js';
import type { EntityProps, LinkProps } from '@vbs/vbs-mod';
import type { EntityCanvasState } from './types/entity-canvas-state.types.js';
import { registry } from './create-signal-registry.js';
import { schemaKey } from './registry-keys.js';
import { createEntityStore } from './create-entity-store.js';
import { createLinkStore } from './create-link-store.js';
import { ENTITY_DEFAULT_WIDTH, ENTITY_DEFAULT_HEIGHT } from './entity-defaults.js';

export interface SchemaStore {
  readonly signal: Signal<SchemaModel>;
  readonly addEntity: (entity: EntityProps, canvas?: EntityCanvasState) => void;
  readonly removeEntity: (entityId: string) => void;
  readonly updateEntityCanvas: (entityId: string, patch: Partial<Omit<EntityCanvasState, 'entityId'>>) => void;
  readonly addLink: (link: LinkProps) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getEntityStore: (entityId: string) => ReturnType<typeof createEntityStore> | undefined;
}

export const createSchemaStore = function(schema: SchemaModel): SchemaStore {
  const signal = registry.getOrCreate<SchemaModel>(schemaKey(schema.id), schema);

  // Hydrate per-entity stores
  schema.entities.forEach(e => createEntityStore(e));
  schema.links.forEach(l => createLinkStore(l));

  const getEntityStore = (entityId: string): ReturnType<typeof createEntityStore> | undefined => {
    const entity = signal.value.entities.find(e => e.id === entityId);
    return entity ? createEntityStore(entity) : undefined;
  };

  const addEntity = (entity: EntityProps, canvas?: EntityCanvasState): void => {
    const cs: EntityCanvasState = canvas ?? {
      entityId: entity.id,
      x: 100, y: 100,
      width: ENTITY_DEFAULT_WIDTH,
      height: ENTITY_DEFAULT_HEIGHT,
    };
    createEntityStore(entity);
    signal.set({
      ...signal.value,
      entities: [...signal.value.entities, entity],
      canvasStates: [...signal.value.canvasStates, cs],
    });
  };

  const removeEntity = (entityId: string): void => {
    signal.set({
      ...signal.value,
      entities: signal.value.entities.filter(e => e.id !== entityId),
      links: signal.value.links.filter(
        l => l.leftEntityId !== entityId && l.rightEntityId !== entityId
      ),
      canvasStates: signal.value.canvasStates.filter(cs => cs.entityId !== entityId),
    });
  };

  const updateEntityCanvas = (
    entityId: string,
    patch: Partial<Omit<EntityCanvasState, 'entityId'>>
  ): void => {
    signal.set({
      ...signal.value,
      canvasStates: signal.value.canvasStates.map(cs =>
        cs.entityId === entityId ? { ...cs, ...patch } : cs
      ),
    });
  };

  const addLink = (link: LinkProps): void => {
    createLinkStore(link);
    signal.set({ ...signal.value, links: [...signal.value.links, link] });
  };

  const removeLink = (linkId: string): void => {
    signal.set({
      ...signal.value,
      links: signal.value.links.filter(l => l.id !== linkId),
    });
  };

  return { signal, addEntity, removeEntity, updateEntityCanvas, addLink, removeLink, getEntityStore };
};
