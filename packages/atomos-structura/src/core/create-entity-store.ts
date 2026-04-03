import type { Signal } from '@atomos/prime';
import type { Entity, Property } from '@atomos/structura-core';
import { registry } from './create-signal-registry.js';
import { entityKey } from './registry-keys.js';

export interface EntityStore {
  readonly signal: Signal<Entity>;
  readonly updateLabel: (label: string) => void;
  readonly addProperty: (prop: Property) => void;
  readonly removeProperty: (propKey: string) => void;
}

export const createEntityStore = function(
  entity: Entity
): EntityStore {
  const signal = registry.getOrCreate<Entity>(entityKey(entity.id), entity);

  const updateLabel = (label: string): void => {
    signal.set({ ...signal.value, name: label, updatedAt: Date.now() });
  };

  const addProperty = (prop: Property): void => {
    signal.set({
      ...signal.value,
      properties: [...signal.value.properties, prop],
      updatedAt: Date.now()
    });
  };

  const removeProperty = (propKey: string): void => {
    signal.set({
      ...signal.value,
      properties: signal.value.properties.filter(p => p.key !== propKey),
      updatedAt: Date.now()
    });
  };

  return { signal, updateLabel, addProperty, removeProperty };
};
