import type { Signal } from './types/signal.types.js';
import type { EntityProps } from '@vbs/vbs-mod';
import { registry } from './create-signal-registry.js';
import { entityKey } from './registry-keys.js';

export interface EntityStore {
  readonly signal: Signal<EntityProps>;
  readonly updateLabel: (label: string) => void;
  readonly addProperty: (prop: EntityProps['propertiesRows'][number]) => void;
  readonly removeProperty: (rowId: string) => void;
}

export const createEntityStore = function(
  entity: EntityProps
): EntityStore {
  const signal = registry.getOrCreate<EntityProps>(entityKey(entity.id), entity);

  const updateLabel = (label: string): void => {
    signal.set({ ...signal.value, name: label, updatedAt: Date.now() });
  };

  const addProperty = (row: EntityProps['propertiesRows'][number]): void => {
    signal.set({
      ...signal.value,
      propertiesRows: [...signal.value.propertiesRows, row],
      updatedAt: Date.now()
    });
  };

  const removeProperty = (rowId: string): void => {
    signal.set({
      ...signal.value,
      propertiesRows: signal.value.propertiesRows.filter(r => r.id !== rowId),
      updatedAt: Date.now()
    });
  };

  return { signal, updateLabel, addProperty, removeProperty };
};
