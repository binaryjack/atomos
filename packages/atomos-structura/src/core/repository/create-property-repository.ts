import type { Property, Entity } from '@atomos-web/structura-core';
import type { IRepository } from './types/repository.types.js';
import type { Signal } from '@atomos-web/prime';
import type { IStorageProvider } from '../storage/types/storage-provider.types.js';
import { createProperty } from '@atomos-web/structura-core';

export interface PropertyRepositoryConfig {
  readonly entityId: string;
  readonly entitySignal: Signal<Entity>;
  readonly storageProvider: IStorageProvider<Entity>;
}

export const createPropertyRepository = function(
  config: PropertyRepositoryConfig
): IRepository<Property> {
  const findById = async (key: string): Promise<Property | undefined> => {
    const entity = config.entitySignal.value;
    return entity.properties.find((p: Property) => p.key === key);
  };

  const findAll = async (): Promise<readonly Property[]> => {
    return config.entitySignal.value.properties;
  };

  const update = async (key: string, data: Partial<Property>): Promise<Property> => {
    const entity = config.entitySignal.value;
    const existing = entity.properties.find((p: Property) => p.key === key);
    if (!existing) throw new Error(`Property ${key} not found`);

    const validated: Property = {
      ...existing,
      ...data,
      key: existing.key
    };
    
    const updated: Entity = {
      ...entity,
      properties: entity.properties.map((p: Property) =>
        p.key === key ? validated : p
      ),
      updatedAt: Date.now()
    };

    console.log(`[property-repo] Updating property ${key} in entity ${config.entityId}, calling entitySignal.set`);
    config.entitySignal.set(updated);
    await config.storageProvider.set(config.entityId, updated);
    
    return validated;
  };

  const create = async (data: Partial<Property>): Promise<Property> => {
    if (!data.key) throw new Error('Property key is required');
    
    const validated = createProperty({
      key: data.key,
      ...(data.label !== undefined ? { label: data.label } : {}),
      componentType: data.componentType ?? 'input',
      ...(data.dataType !== undefined ? { dataType: data.dataType } : {}),
      ...(data.value !== undefined ? { value: data.value } : {}),
      ...(data.validation !== undefined ? { validation: data.validation } : {})
    });
    
    const entity = config.entitySignal.value;
    
    const updated: Entity = {
      ...entity,
      properties: [...entity.properties, validated],
      updatedAt: Date.now()
    };

    config.entitySignal.set(updated);
    await config.storageProvider.set(config.entityId, updated);
    
    return validated;
  };

  const deleteProperty = async (key: string): Promise<void> => {
    const entity = config.entitySignal.value;
    
    const updated: Entity = {
      ...entity,
      properties: entity.properties.filter((p: Property) => p.key !== key),
      updatedAt: Date.now()
    };

    config.entitySignal.set(updated);
    await config.storageProvider.set(config.entityId, updated);
  };

  return { findById, findAll, update, create, delete: deleteProperty };
};
