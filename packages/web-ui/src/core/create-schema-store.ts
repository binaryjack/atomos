import type { Signal } from './types/signal.types.js';
import type { SchemaModel } from './types/schema-model.types.js';
import type { Entity, LinkProps } from '@vbs/vbs-mod';
import type { EntityCanvasState } from './types/entity-canvas-state.types.js';
import { registry } from './create-signal-registry.js';
import { schemaKey } from './registry-keys.js';
import { createEntityStore } from './create-entity-store.js';
import { createLinkStore } from './create-link-store.js';
import { ENTITY_DEFAULT_WIDTH, ENTITY_DEFAULT_HEIGHT } from './entity-defaults.js';

// Module-level dedup: prevents double-subscribing when createSchemaStore is called
// multiple times for the same schema (registry.getOrCreate is idempotent).
const _entitySubs = new Map<string, () => void>(); // key: `${schemaId}:${entityId}`
const _schemaStores = new Map<string, SchemaStore>(); // key: schemaId - ensures true idempotency

/** TESTING ONLY: Clear module-level caches */
export const __clearSchemaStoreCaches = (): void => {
  _entitySubs.forEach(unsub => unsub());
  _entitySubs.clear();
  _schemaStores.clear();
};

export interface SchemaStore {
  readonly signal: Signal<SchemaModel>;
  readonly addEntity: (entity: Entity, canvas?: EntityCanvasState) => void;
  readonly removeEntity: (entityId: string) => void;
  readonly updateEntityCanvas: (entityId: string, patch: Partial<Omit<EntityCanvasState, 'entityId'>>) => void;
  readonly addLink: (link: LinkProps) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getEntityStore: (entityId: string) => ReturnType<typeof createEntityStore> | undefined;
}

export const createSchemaStore = function(schema: SchemaModel): SchemaStore {
  // True idempotency: return existing store if already created
  if (_schemaStores.has(schema.id)) {
    console.log(`[schema-store] Returning existing store for schema ${schema.id}`);
    return _schemaStores.get(schema.id)!;
  }
  
  console.log(`[schema-store] Creating NEW store for schema ${schema.id}, entities:`, schema.entities.map(e => e.id));
  const signal = registry.getOrCreate<SchemaModel>(schemaKey(schema.id), schema);

  // Subscribe an entity signal → schema signal (idempotent via _entitySubs).
  const subscribeEntity = (entity: Entity): void => {
    const subKey = `${schema.id}:${entity.id}`;
    if (_entitySubs.has(subKey)) {
      console.log(`[schema-store] SKIPPING entity ${entity.id} - already subscribed`);
      return;
    }
    const { signal: entitySignal } = createEntityStore(entity);
    console.log(`[schema-store] SUBSCRIBING entity ${entity.id} to schema ${schema.id}`);
    const unsub = entitySignal.subscribe((updated: Entity) => {
      console.log(`[schema-store] Entity ${updated.id} changed, syncing to schema signal`);
      signal.set({
        ...signal.value,
        entities: signal.value.entities.map(e => e.id === entity.id ? updated : e),
      });
    });
    _entitySubs.set(subKey, unsub);
  };

  // Hydrate per-entity stores and wire up subscriptions.
  schema.entities.forEach(e => subscribeEntity(e));
  schema.links.forEach(l => createLinkStore(l));

  const getEntityStore = (entityId: string): ReturnType<typeof createEntityStore> | undefined => {
    const entity = signal.value.entities.find(e => e.id === entityId);
    return entity ? createEntityStore(entity) : undefined;
  };

  const addEntity = (entity: Entity, canvas?: EntityCanvasState): void => {
    const cs: EntityCanvasState = canvas ?? {
      entityId: entity.id,
      x: 100, y: 100,
      width: ENTITY_DEFAULT_WIDTH,
      height: ENTITY_DEFAULT_HEIGHT,
    };
    subscribeEntity(entity);
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

  const store: SchemaStore = { signal, addEntity, removeEntity, updateEntityCanvas, addLink, removeLink, getEntityStore };
  _schemaStores.set(schema.id, store);
  
  return store;
};

