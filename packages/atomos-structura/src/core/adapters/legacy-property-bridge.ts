/**
 * Legacy Property Bridge
 * Connects existing property UI components to clean architecture
 */
import type { Entity, Property } from '@atomos-web/structura-core';
import { createProperty } from '@atomos-web/structura-core';
import type { EntityStore } from '../create-entity-store.js';
import { createSignal } from '@atomos-web/prime';
import type { IRepository } from '../repository/types/repository.types.js';
import type { IStorageProvider } from '../storage/types/storage-provider.types.js';
import type { Signal } from '@atomos-web/prime';
import { getCanvasAdapter } from './canvas-adapter.js';

/**
 * Legacy Entity Store Bridge
 * Adapts clean architecture to legacy signal-based entity store interface
 */
export const createLegacyEntityStoreBridge = function(entityId: string): EntityStore {
  const adapter = getCanvasAdapter();
  
  // Get initial entity from clean architecture
  const initialEntity = adapter.getEntity(entityId);
  if (!initialEntity) {
    throw new Error(`Entity ${entityId} not found in clean architecture`);
  }
  
  // Convert domain entity to legacy Entity format
  const legacyEntity: Entity = {
    id: initialEntity.id,
    code: initialEntity.id, // fallback
    name: initialEntity.name,
    ...(initialEntity.collapsed !== undefined ? { collapsed: initialEntity.collapsed } : {}),
    properties: initialEntity.properties as Property[],
    position: initialEntity.position,
    dimensions: initialEntity.dimensions,
    createdAt: initialEntity.createdAt,
    updatedAt: initialEntity.updatedAt,
    edges: [] // TODO: implement edge management
  };
  
  const signal = createSignal<Entity>(legacyEntity);
  
  // Subscribe to clean architecture changes and update signal
  const unsubscribe = adapter.onEntityChanged((event) => {
    const eventEntityId = event.type === 'EntityCreated' 
      ? event.entity.id 
      : event.type === 'EntityRemoved' 
        ? event.entityId
        : 'entityId' in event 
          ? event.entityId 
          : undefined;
          
    if (eventEntityId === entityId) {
      const updatedEntity = adapter.getEntity(entityId);
      if (updatedEntity) {
        const legacyUpdated: Entity = {
          id: updatedEntity.id,
          code: updatedEntity.id,
          name: updatedEntity.name,
          ...(updatedEntity.collapsed !== undefined ? { collapsed: updatedEntity.collapsed } : {}),
          properties: updatedEntity.properties as Property[],
          position: updatedEntity.position,
          dimensions: updatedEntity.dimensions,
          createdAt: updatedEntity.createdAt,
          updatedAt: updatedEntity.updatedAt,
          edges: []
        };
        signal.set(legacyUpdated);
        console.log(`[LegacyBridge] Entity ${entityId} signal updated from clean architecture`);
      }
    }
  });
  
  const updateLabel = function(label: string): void {
    console.log(`[LegacyBridge] Updating entity ${entityId} name to "${label}" via clean architecture`);
    adapter.updateEntityName(entityId, label);
  };
  
  const updateCollapse = function(collapsed: boolean): void {
    console.log(`[LegacyBridge] Toggling entity ${entityId} collapse state to ${collapsed} via clean architecture`);
    adapter.updateEntityCollapse(entityId, collapsed);
  };

  const addProperty = function(prop: Property): void {
    console.log(`[LegacyBridge] Adding property ${prop.key} to entity ${entityId} via clean architecture`);
    const currentEntity = adapter.getEntity(entityId);
    if (currentEntity) {
      const newProperties = [...currentEntity.properties, prop];
      adapter.updateEntityProperties(entityId, newProperties);
    }
  };
  
  const removeProperty = function(propKey: string): void {
    console.log(`[LegacyBridge] Removing property ${propKey} from entity ${entityId} via clean architecture`);
    const currentEntity = adapter.getEntity(entityId);
    if (currentEntity) {
      const newProperties = currentEntity.properties.filter(p => p.key !== propKey);
      adapter.updateEntityProperties(entityId, newProperties);
    }
  };
  
  // Clean up subscription when entity store is destroyed
  (signal as any).__cleanup = unsubscribe;
  
  return { signal, updateLabel, updateCollapse, addProperty, removeProperty };
};

/**
 * Legacy Property Repository Bridge
 * Adapts clean architecture to legacy property repository interface
 */
export const createLegacyPropertyRepositoryBridge = function(config: {
  entityId: string;
  entitySignal: Signal<Entity>;
  storageProvider: IStorageProvider<Entity>;
}): IRepository<Property> {
  const adapter = getCanvasAdapter();
  
  const findById = async function(key: string): Promise<Property | undefined> {
    const entity = adapter.getEntity(config.entityId);
    return entity?.properties.find((p: any) => p.key === key);
  };
  
  const findAll = async function(): Promise<readonly Property[]> {
    const entity = adapter.getEntity(config.entityId);
    return entity?.properties as Property[] || [];
  };
  
  const update = async function(key: string, data: Partial<Property>): Promise<Property> {
    console.log(`[LegacyPropertyBridge] Updating property ${key} in entity ${config.entityId}`);
    
    const entity = adapter.getEntity(config.entityId);
    if (!entity) throw new Error(`Entity ${config.entityId} not found`);
    
    const props = entity.properties ?? [];
    const existing = props.find((p: any) => p.key === key);
    if (!existing) throw new Error(`Property ${key} not found`);
    
    const updated: Property = {
      ...existing,
      ...data,
      key: existing.key
    };
    
    const newProperties = props.map((p: any) =>
      p.key === key ? updated : p
    );
    
    adapter.updateEntityProperties(config.entityId, newProperties);
    return updated;
  };
  
  const create = async function(data: Partial<Property>): Promise<Property> {
    console.log(`[LegacyPropertyBridge] Creating property in entity ${config.entityId}`);
    
    if (!data.key) throw new Error('Property key is required');
    
    const validated = createProperty({
      key: data.key,
      label: data.label || data.key,
      componentType: data.componentType ?? 'input',
      dataType: data.dataType || 'string',
      value: data.value,
      ...(data.validation !== undefined ? { validation: data.validation } : {})
    });
    
    const entity = adapter.getEntity(config.entityId);
    if (!entity) throw new Error(`Entity ${config.entityId} not found`);
    
    const newProperties = [...(entity.properties ?? []), validated];
    adapter.updateEntityProperties(config.entityId, newProperties);
    
    return validated;
  };
  
  const deleteProperty = async function(key: string): Promise<void> {
    console.log(`[LegacyPropertyBridge] Deleting property ${key} from entity ${config.entityId}`);
    
    const entity = adapter.getEntity(config.entityId);
    if (!entity) throw new Error(`Entity ${config.entityId} not found`);
    
    const newProperties = (entity.properties ?? []).filter((p: any) => p.key !== key);
    adapter.updateEntityProperties(config.entityId, newProperties);
  };
  
  return { findById, findAll, update, create, delete: deleteProperty };
};

/**
 * Legacy Storage Provider Bridge
 * Adapts clean architecture to legacy storage provider interface
 */
export const createLegacyStorageProviderBridge = function<T>(): IStorageProvider<T> {
  console.log('[LegacyBridge] Created storage provider bridge - delegates to clean architecture persistence');
  
  return {
    get: async function(key: string): Promise<T | null> {
      console.log(`[LegacyStorageBridge] get(${key}) - delegating to clean architecture`);
      // Clean architecture handles loading automatically
      return null;
    },
    
    set: async function(key: string, value: T): Promise<void> {
      console.log(`[LegacyStorageBridge] set(${key}) - clean architecture handles persistence automatically`);
      // Clean architecture handles persistence automatically via repository
    },
    
    delete: async function(key: string): Promise<void> {
      console.log(`[LegacyStorageBridge] delete(${key}) - delegating to clean architecture`);
      // Clean architecture handles deletion
    },
    
    list: async function(): Promise<readonly string[]> {
      console.log('[LegacyStorageBridge] list() - delegating to clean architecture');
      const adapter = getCanvasAdapter();
      const entities = adapter.getAllEntities();
      return entities.map(e => e.id);
    },
    
    clear: async function(): Promise<void> {
      console.log('[LegacyStorageBridge] clear() - clean architecture would handle clearing all entities');
      // Clean architecture could handle clearing all entities
    }
  };
};
