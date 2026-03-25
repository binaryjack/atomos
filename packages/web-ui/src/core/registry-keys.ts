/**
 * Singleton key objects used as WeakMap keys in the signal registry.
 * One key per logical domain scope.
 */

export const APP_KEY        = Object.freeze({ scope: 'app' });
export const GLOBAL_KEY     = Object.freeze({ scope: 'global' });
export const SCHEMAS_KEY    = Object.freeze({ scope: 'schemas' });

/** Per-schema key — one unique object per schema id */
const schemaKeys  = new Map<string, object>();
const entityKeys  = new Map<string, object>();
const linkKeys    = new Map<string, object>();
const canvasKeys  = new Map<string, object>();

export const schemaKey  = (id: string): object => {
  if (!schemaKeys.has(id))  schemaKeys.set(id,  Object.freeze({ scope: 'schema',  id }));
  return schemaKeys.get(id)!;
};

export const entityKey  = (id: string): object => {
  if (!entityKeys.has(id))  entityKeys.set(id,  Object.freeze({ scope: 'entity',  id }));
  return entityKeys.get(id)!;
};

export const linkKey    = (id: string): object => {
  if (!linkKeys.has(id))    linkKeys.set(id,    Object.freeze({ scope: 'link',    id }));
  return linkKeys.get(id)!;
};

export const canvasKey  = (id: string): object => {
  if (!canvasKeys.has(id))  canvasKeys.set(id,  Object.freeze({ scope: 'canvas',  id }));
  return canvasKeys.get(id)!;
};
