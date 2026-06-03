import type { Entity, Property } from '@atomos/structura-core'
import type { ReduxState } from '../types/redux-state.types.js'
import { getInstanceReduxStore } from './create-redux-store.js'

/**
 * Generic selector creator.
 * Encapsulates the instance-specific redux store read.
 * BREAKING v2.0.0: All selectors now require instanceId as the first parameter.
 */
export const createSelector = <TArgs extends unknown[], TResult>(
  selectorFn: (state: ReduxState, ...args: TArgs) => TResult
) => {
  return (instanceId: string, ...args: TArgs): TResult => {
    if (!instanceId) {
      throw new Error('Structura selectors now require a non-empty instanceId as the first argument.');
    }
    const state = getInstanceReduxStore(instanceId).get_state();
    return selectorFn(state, ...args);
  };
};

/** Returns the active schema from the active canvas, or undefined. */
const getActiveSchema = (state: ReduxState) => {
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  return canvas?.schemas[canvas.active_schema_id];
};

/**
 * Select an Entity by its ID
 */
export const selectEntityById = createSelector(
  (state, entityId: string): Entity | undefined => {
    const schema = getActiveSchema(state);
    if (!schema) return undefined;
    return schema.entities.find((e) => e.id === entityId);
  }
);

/**
 * Select a specific Property from an Entity by keys
 */
export const selectPropertyByKey = createSelector(
  (state, entityId: string, propertyKey: string): Property | undefined => {
    const schema = getActiveSchema(state);
    if (!schema) return undefined;
    const entity = schema.entities.find((e) => e.id === entityId);
    if (!entity) return undefined;
    return entity.properties?.find((p) => p.key === propertyKey);
  }
);

/**
 * Select all Entities
 */
export const selectAllEntities = createSelector(
  (state): readonly Entity[] => {
    const schema = getActiveSchema(state);
    if (!schema) return [];
    return schema.entities;
  }
);

/**
 * Select a Link by ID
 */
export const selectLinkById = createSelector(
  (state, linkId: string) => {
    const schema = getActiveSchema(state);
    if (!schema) return undefined;
    return schema.links.find((l) => l.id === linkId);
  }
);
