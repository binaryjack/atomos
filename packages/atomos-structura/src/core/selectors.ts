import { getGlobalReduxStore } from './create-redux-store.js';
import type { ReduxState } from '../types/redux-state.types.js';
import type { Entity, Property } from '@atomos/structura-core';

const SCHEMA_ID = 'schema-default';

/**
 * Generic selector creator.
 * Encapsulates the global redux store read.
 */
export const createSelector = <TArgs extends any[], TResult>(
  selectorFn: (state: ReduxState, ...args: TArgs) => TResult
) => {
  return (...args: TArgs): TResult => {
    const state = getGlobalReduxStore().get_state();
    return selectorFn(state, ...args);
  };
};

/**
 * Select an Entity by its ID
 */
export const selectEntityById = createSelector(
  (state, entityId: string): Entity | undefined => {
    const schema = state.schemas[SCHEMA_ID];
    if (!schema) return undefined;
    return schema.entities.find((e: any) => e.id === entityId);
  }
);

/**
 * Select a specific Property from an Entity by keys
 */
export const selectPropertyByKey = createSelector(
  (state, entityId: string, propertyKey: string): Property | undefined => {
    const schema = state.schemas[SCHEMA_ID];
    if (!schema) return undefined;
    const entity = schema.entities.find((e: any) => e.id === entityId);
    if (!entity) return undefined;
    return entity.properties?.find((p: any) => p.key === propertyKey);
  }
);

/**
 * Select all Entities
 */
export const selectAllEntities = createSelector(
  (state): readonly Entity[] => {
    const schema = state.schemas[SCHEMA_ID];
    if (!schema) return [];
    return schema.entities;
  }
);

/**
 * Select a Link by ID
 */
export const selectLinkById = createSelector(
  (state, linkId: string) => {
    const schema = state.schemas[SCHEMA_ID];
    if (!schema) return undefined;
    return schema.links.find((l: any) => l.id === linkId);
  }
);
