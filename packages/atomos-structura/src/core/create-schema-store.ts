import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { createEntityStore } from './create-entity-store.js';
import { createLinkStore } from './create-link-store.js';
import { registry } from './create-signal-registry.js';
import { ENTITY_DEFAULT_HEIGHT, ENTITY_DEFAULT_WIDTH } from './entity-defaults.js';
import { schemaKey } from './registry-keys.js';
import type { EntityCanvasState } from './types/entity-canvas-state.types.js';
import type { SchemaModel } from './types/schema-model.types.js';
import type { Signal } from '@atomos-web/prime';

// Module-level dedup: prevents double-subscribing when createSchemaStore is called
// multiple times for the same schema (registry.getOrCreate is idempotent).
const _entitySubs = new Map<string, () => void>(); // key: `${schemaId}:${entityId}`
const _entityStores = new Map<string, ReturnType<typeof createEntityStore>>(); // key: `${schemaId}:${entityId}` - ensures entity store reuse
const _schemaStores = new Map<string, SchemaStore>(); // key: schemaId - ensures true idempotency

// Legacy fallbacks for deprecated functions
const getReduxStore = (): { get_state: () => any; dispatch: (action: any) => void } | null => null; // Deprecated - replaced by clean architecture
const schemaDevTools: { send: (action: any) => void } | null = null as any; // Deprecated - replaced by clean architecture

/** TESTING ONLY: Clear module-level caches */
export const __clearSchemaStoreCaches = (): void => {
  _entitySubs.forEach(unsub => unsub());
  _entitySubs.clear();
  _entityStores.clear();
  _schemaStores.clear();
};

export interface SchemaStore {
  readonly signal: Signal<SchemaModel>;
  readonly addEntity: (entity: Entity, canvas?: EntityCanvasState) => void;
  readonly updateEntity: (entityId: string, entity: Entity) => void;
  readonly removeEntity: (entityId: string) => void;
  readonly updateEntityCanvas: (entityId: string, patch: Partial<Omit<EntityCanvasState, 'entityId'>>) => void;
  readonly addLink: (link: LinkProps) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getEntityStore: (entityId: string) => ReturnType<typeof createEntityStore> | undefined;
  readonly cleanup: () => void;
}

export const createSchemaStore = function(schema: SchemaModel): SchemaStore {
  // True idempotency: return existing store if already created
  if (_schemaStores.has(schema.id)) {
    console.log(`[schema-store] Returning existing store for schema ${schema.id}`);
    return _schemaStores.get(schema.id)!;
  }
  
  console.log(`[schema-store] Creating NEW store for schema ${schema.id}`);
  console.log(`[LOAD-DEBUG] Schema data:`, schema);
  console.log(`[LOAD-DEBUG] Entities: ${schema.entities.length}`, schema.entities.map(e => `${e.id}(${e.name})`));
  console.log(`[LOAD-DEBUG] Links: ${schema.links.length}`, schema.links.map(l => `${l.id}: ${l.leftEntityId}->${l.rightEntityId}`));
  console.log(`[LOAD-DEBUG] Canvas states: ${schema.canvasStates.length}`, schema.canvasStates.map(cs => `${cs.entityId}@(${cs.x},${cs.y})`));
  
  const signal = registry.getOrCreate<SchemaModel>(schemaKey(schema.id), schema);
  
  // REDUX INTEGRATION: Initialize Redux store with existing entities
  const redux_store = getReduxStore();
  if (redux_store) {
    const schema_id = 'schema-default';
    
    // Restore state from Redux store
    const redux_state = redux_store.get_state();
    const redux_schema = redux_state.schemas[schema_id];
    
    console.log(`🏪 [REDUX-DEBUG] Redux state:`, redux_state);
    console.log(`🏪 [REDUX-DEBUG] Redux schema:`, redux_schema);
    console.log(`🏪 [REDUX-DEBUG] Redux schema links:`, redux_schema?.links || []);
    
    if (redux_schema && (redux_schema.entities.length > 0 || redux_schema.links.length > 0)) {
      console.log(`🏪 [REDUX-LOAD] Restoring ${redux_schema.entities.length} entities and ${redux_schema.links.length} links from Redux store`);
      
      // Convert Redux entities back to schema format
      const restored_entities = redux_schema.entities.map((re: Entity) => ({
        id: re.id,
        code: re.code,
        name: re.name,
        createdAt: re.createdAt,
        updatedAt: re.updatedAt,
        properties: re.properties || [],
        position: re.position,
        dimensions: re.dimensions,
        edges: re.edges || []
      }));
      
      const restored_canvas_states = redux_schema.entities.map((re: Entity) => ({
        entityId: re.id,
        x: re.position.x,
        y: re.position.y,
        width: re.dimensions.width,
        height: re.dimensions.height
      }));
      
      const restored_links = [...(redux_schema.links || [])];
      
      // Update signal with restored data
      signal.set({
        ...signal.value,
        entities: restored_entities,
        canvasStates: restored_canvas_states,
        links: restored_links
      });
      
      // Create link stores for restored links (needed for proper link management)
      restored_links.forEach(link => createLinkStore(link));
    } else {
      // Initialize Redux with current schema data
      schema.entities.forEach(entity => {
        const canvas = schema.canvasStates.find(cs => cs.entityId === entity.id) || {
          entityId: entity.id,
          x: 100, y: 100,
          width: ENTITY_DEFAULT_WIDTH,
          height: ENTITY_DEFAULT_HEIGHT
        };
        
        redux_store.dispatch({
          type: 'entity-added',
          schema_id,
          entity: {
            ...entity,
            position: { x: canvas.x, y: canvas.y },
            dimensions: { width: canvas.width, height: canvas.height }
          }
        });
      });
      
      // Initialize Redux with current links
      schema.links.forEach(link => {
        redux_store.dispatch({
          type: 'link-created',
          schema_id,
          from_id: link.leftEntityId,
          to_id: link.rightEntityId,
          from_anchor: link.leftAnchorId,
          to_anchor: link.rightAnchorId
        });
      });
    }
  }

  // Subscribe an entity signal → schema signal (idempotent via _entitySubs).
  const subscribeEntity = (entity: Entity): void => {
    const subKey = `${schema.id}:${entity.id}`;
    if (_entitySubs.has(subKey)) {
      console.log(`[schema-store] SKIPPING entity ${entity.id} - already subscribed`);
      return;
    }
    
    // Create or reuse entity store instance
    const storeKey = `${schema.id}:${entity.id}`;
    let entityStore = _entityStores.get(storeKey);
    if (!entityStore) {
      console.log(`[schema-store] CREATING entity store for ${entity.id}`);
      entityStore = createEntityStore(entity);
      _entityStores.set(storeKey, entityStore);
    } else {
      console.log(`[schema-store] REUSING entity store for ${entity.id}`);
    }
    
    console.log(`[schema-store] SUBSCRIBING entity ${entity.id} to schema ${schema.id}`);
    const unsub = entityStore.signal.subscribe((updated: Entity) => {
      console.log(`[schema-store] 🔄 Entity ${updated.id} changed, syncing to schema signal and Redux`);
      console.log(`[schema-store] Updated properties:`, updated.properties?.map(p => `${p.key}:${p.dataType}`));
      
      // Update schema signal
      const newEntities = signal.value.entities.map(e => e.id === entity.id ? updated : e);
      const updatedSchema = {
        ...signal.value,
        entities: newEntities,
      };
      signal.set(updatedSchema);
      
      // Legacy devTools removed - replaced by clean architecture
      
      // CRITICAL: Also trigger Redux persistence for property changes
      console.log(`[schema-store] 🏪 Triggering Redux persistence for entity property changes`);
      const redux_store = getReduxStore();
      if (redux_store) {
        const schema_id = 'schema-default';
        const canvasState = signal.value.canvasStates.find(cs => cs.entityId === entity.id);
        redux_store.dispatch({
          type: 'entity-updated',
          schema_id,
          entity: {
            ...updated,
            position: canvasState ? { x: canvasState.x, y: canvasState.y } : { x: 100, y: 100 },
            dimensions: canvasState ? { width: canvasState.width, height: canvasState.height } : { width: ENTITY_DEFAULT_WIDTH, height: ENTITY_DEFAULT_HEIGHT }
          }
        });
        console.log(`[schema-store] ✅ Redux dispatch completed for property changes`);
      }
    });
    _entitySubs.set(subKey, unsub);
  };

  // Hydrate per-entity stores and wire up subscriptions.
  schema.entities.forEach(e => subscribeEntity(e));
  schema.links.forEach(l => createLinkStore(l));

  const getEntityStore = (entityId: string): ReturnType<typeof createEntityStore> | undefined => {
    const storeKey = `${schema.id}:${entityId}`;
    let entityStore = _entityStores.get(storeKey);
    
    if (!entityStore) {
      // Entity store doesn't exist yet - create it
      const entity = signal.value.entities.find(e => e.id === entityId);
      if (!entity) {
        console.warn(`[schema-store] Entity ${entityId} not found in schema ${schema.id}`);
        return undefined;
      }
      console.log(`[schema-store] Creating entity store for ${entityId} (via getEntityStore)`);
      entityStore = createEntityStore(entity);
      _entityStores.set(storeKey, entityStore);
    }
    
    return entityStore;
  };

  const addEntity = (entity: Entity, canvas?: EntityCanvasState): void => {
    const cs: EntityCanvasState = canvas ?? {
      entityId: entity.id,
      x: 100, y: 100,
      width: ENTITY_DEFAULT_WIDTH,
      height: ENTITY_DEFAULT_HEIGHT,
    };
    
    // Subscribe entity with shared store management
    subscribeEntity(entity);
    
    const updatedSchema = {
      ...signal.value,
      entities: [...signal.value.entities, entity],
      canvasStates: [...signal.value.canvasStates, cs],
    };
    
    signal.set(updatedSchema);
    console.log(`[schema-store] Entity ${entity.id} added successfully`);
  };

  const updateEntity = (entityId: string, updatedEntity: Entity): void => {
    console.log(`🏪 [REDUX-SCHEMA-STORE] updateEntity(${entityId})`);
    console.log(`🏪 [REDUX-SCHEMA-STORE] Updated properties:`, updatedEntity.properties?.map(p => `${p.key}:${p.dataType}`));
    
    // Update local signal
    const currentState = signal.value;
    const updatedEntities = currentState.entities.map(e => 
      e.id === entityId ? updatedEntity : e
    );
    
    const updatedSchema = {
      ...currentState,
      entities: updatedEntities,
    };
    
    console.log(`🏪 [REDUX-SCHEMA-STORE] Setting local signal with updated entities`);
    signal.set(updatedSchema);
    
    // Legacy devTools removed - replaced by clean architecture
    
    // REDUX INTEGRATION: Update entity in Redux store
    const redux_store = getReduxStore();
    if (redux_store) {
      const schema_id = 'schema-default';
      const canvasState = currentState.canvasStates.find(cs => cs.entityId === entityId);
      console.log(`🏪 [REDUX-SCHEMA-STORE] Dispatching entity-updated to Redux store`);
      redux_store.dispatch({
        type: 'entity-updated',
        schema_id,
        entity: {
          ...updatedEntity,
          position: canvasState ? { x: canvasState.x, y: canvasState.y } : { x: 100, y: 100 },
          dimensions: canvasState ? { width: canvasState.width, height: canvasState.height } : { width: ENTITY_DEFAULT_WIDTH, height: ENTITY_DEFAULT_HEIGHT }
        }
      });
      console.log(`🏪 [REDUX-SCHEMA-STORE] ✓ Redux dispatch completed`);
    } else {
      console.error(`🏪 [REDUX-SCHEMA-STORE] ❌ No Redux store found!`);
    }
  };

  const removeEntity = (entityId: string): void => {
    console.log(`🏪 [REDUX-SCHEMA-STORE] removeEntity(${entityId}) - starting cascade deletion`);
    
    // Clean up entity subscription and store to prevent memory leak
    const subKey = `${schema.id}:${entityId}`;
    const unsub = _entitySubs.get(subKey);
    if (unsub) {
      console.log(`[schema-store] Cleaning up subscription for entity ${entityId}`);
      unsub();
      _entitySubs.delete(subKey);
    }
    // Clean up shared entity store
    _entityStores.delete(subKey);
    
    // Filter out connected links for logging
    const connectedLinks = signal.value.links.filter(
      l => l.leftEntityId === entityId || l.rightEntityId === entityId
    );
    console.log(`🏪 [REDUX-SCHEMA-STORE] Found ${connectedLinks.length} connected links to cascade delete:`, 
                connectedLinks.map(l => l.id));
    
    signal.set({
      ...signal.value,
      entities: signal.value.entities.filter(e => e.id !== entityId),
      links: signal.value.links.filter(
        l => l.leftEntityId !== entityId && l.rightEntityId !== entityId
      ),
      canvasStates: signal.value.canvasStates.filter(cs => cs.entityId !== entityId),
    });
    
    console.log(`🏪 [REDUX-SCHEMA-STORE] Local signal updated - entity and ${connectedLinks.length} links removed`);

  };

  const updateEntityCanvas = (
    entityId: string,
    patch: Partial<Omit<EntityCanvasState, 'entityId'>>
  ): void => {
    console.log(`🏪 [REDUX-SCHEMA-STORE] updateEntityCanvas(${entityId}, ${JSON.stringify(patch)})`);
    
    // Update the local signal state (for existing UI compatibility)
    const newCanvasStates = signal.value.canvasStates.map(cs =>
      cs.entityId === entityId ? { ...cs, ...patch } : cs
    );
    signal.set({
      ...signal.value,
      canvasStates: newCanvasStates,
    });
    console.log(`[schema-store] Entity ${entityId} canvas state updated:`, patch);
  };

  const addLink = (link: LinkProps): void => {
    console.log('[SCHEMA-STORE] addLink called with:', link);
    createLinkStore(link);
    const newLinks = [...signal.value.links, link];
    console.log('[SCHEMA-STORE] New links array:', newLinks);
    signal.set({ ...signal.value, links: newLinks });
    console.log('[SCHEMA-STORE] Schema updated with new link');
  };

  const removeLink = (linkId: string): void => {
    const newLinks = signal.value.links.filter(l => l.id !== linkId);
    signal.set({
      ...signal.value,
      links: newLinks,
    });
    console.log(`[schema-store] Link ${linkId} removed successfully`);
  };

  const cleanup = (): void => {
    // Clean up all entity subscriptions for this schema
    schema.entities.forEach(entity => {
      const subKey = `${schema.id}:${entity.id}`;
      const unsub = _entitySubs.get(subKey);
      if (unsub) {
        unsub();
        _entitySubs.delete(subKey);
      }
      // Clean up entity stores
      _entityStores.delete(subKey);
    });
    
    _schemaStores.delete(schema.id);
    console.log(`[schema-store] Cleaned up schema store ${schema.id}`);
  };

  const store: SchemaStore = { 
    signal, addEntity, updateEntity, removeEntity, updateEntityCanvas, addLink, removeLink, getEntityStore, cleanup 
  };
  _schemaStores.set(schema.id, store);
  
  return store;
};

