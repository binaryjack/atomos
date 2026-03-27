import type { Entity } from '@vbs/vbs-mod';
import type { IStorageProvider } from './types/storage-provider.types.js';
import type { SchemaStore } from '../create-schema-store.js';

export interface ReduxStorageProviderConfig {
  readonly schemaStore: SchemaStore;
}

/**
 * Redux-based storage provider that synchronizes with the schema store
 * instead of using localStorage directly.
 */
export const createReduxStorageProvider = function<T extends Entity>(
  config: ReduxStorageProviderConfig
): IStorageProvider<T> {
  const get = async (key: string): Promise<T | null> => {
    console.log(`[REDUX-STORAGE] Getting entity ${key}`);
    const entity = config.schemaStore.signal.value.entities.find(e => e.id === key);
    return entity as T | null;
  };

  const set = async (key: string, data: T): Promise<void> => {
    console.log(`[REDUX-STORAGE] Setting entity ${key}:`, data);
    
    // Check if entity exists in store
    const existing = config.schemaStore.signal.value.entities.find(e => e.id === key);
    
    if (existing) {
      // Update existing entity
      config.schemaStore.updateEntity(key, data);
    } else {
      // Add new entity
      config.schemaStore.addEntity(data);
    }
  };

  const delete_ = async (key: string): Promise<void> => {
    console.log(`[REDUX-STORAGE] Removing entity ${key}`);
    config.schemaStore.removeEntity(key);
  };

  const clear = async (): Promise<void> => {
    console.log(`[REDUX-STORAGE] Clear not implemented - would remove all entities`);
    // This could be implemented but might be dangerous
  };

  const list = async (): Promise<readonly string[]> => {
    const keys = config.schemaStore.signal.value.entities.map(e => e.id);
    console.log(`[REDUX-STORAGE] Getting all keys:`, keys);
    return keys;
  };

  return {
    get,
    set,
    delete: delete_,
    clear,
    list,
  };
};