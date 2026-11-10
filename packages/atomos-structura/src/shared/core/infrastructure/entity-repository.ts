/**
 * Infrastructure Layer - Repository Implementation
 * Handles persistence through the Instance-specific Redux Store
 */
import type { Entity } from '@atomos-web/structura-core'
import { getInstanceReduxStore } from '../create-redux-store.js'
import type { DomainEntity, DomainLink, EntityRepository, LinkRepository } from '../domain/entity-aggregate.js'

/** Always routes to whichever schema is currently active in the active canvas for a given instance. */
const getSchemaId = (instanceId: string): string => {
  const state = getInstanceReduxStore(instanceId).get_state();
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  return canvas?.active_schema_id ?? 'schema-default';
};

const getActiveSchema = (instanceId: string, schemaId: string) => {
  const state = getInstanceReduxStore(instanceId).get_state();
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  return canvas?.schemas[schemaId];
};

export const createPersistedEntityRepository = function(instanceId: string): EntityRepository {
  if (!instanceId) throw new Error('createPersistedEntityRepository requires an instanceId');
  const store = getInstanceReduxStore(instanceId);

  const getById = function(id: string): DomainEntity | undefined {
    const schema = getActiveSchema(instanceId, getSchemaId(instanceId));
    if (!schema) return undefined;
    return schema.entities.find((e) => e.id === id) as unknown as DomainEntity;
  };

  const save = function(entity: DomainEntity): void {
    const schemaId = getSchemaId(instanceId);
    const schema = getActiveSchema(instanceId, schemaId);
    const stored = schema?.entities.find((e) => e.id === entity.id);

    // Lossless DomainEntity -> Entity: keeps stored edge geometry and every workflow field
    // (nodeType, config, metadata, ports) carried by the aggregate.
    const reduxEntity = { ...entity, code: stored?.code ?? entity.name, edges: stored?.edges ?? [] } as unknown as Entity;

    if (stored) {
      store.dispatch({
        type: 'entity-updated',
        schema_id: schemaId,
        entity: reduxEntity
      });
    } else {
      store.dispatch({
        type: 'entity-added',
        schema_id: schemaId,
        entity: reduxEntity
      });
    }
  };

  const remove = function(id: string): void {
    store.dispatch({ type: 'entity-removed', schema_id: getSchemaId(instanceId), entity_id: id });
  };

  const getAll = function(): readonly DomainEntity[] {
    const schema = getActiveSchema(instanceId, getSchemaId(instanceId));
    if (!schema) return [];
    return schema.entities as unknown as DomainEntity[];
  };

  return { getById, save, remove, getAll };
};

export const createPersistedLinkRepository = function(instanceId: string): LinkRepository {
  if (!instanceId) throw new Error('createPersistedLinkRepository requires an instanceId');
  const store = getInstanceReduxStore(instanceId);

  const getById = function(id: string): DomainLink | undefined {
    const schema = getActiveSchema(instanceId, getSchemaId(instanceId));
    if (!schema) return undefined;

    const link = schema.links.find((l: any) => l.id === id);
    if (!link) return undefined;

    return {
      id: link.id,
      sourceAnchorId: link.leftAnchorId || 'center',
      targetAnchorId: link.rightAnchorId || 'center',
      sourceEntityId: link.leftEntityId,
      targetEntityId: link.rightEntityId,
      sourceCardinality: link.leftCardinality || '1',
      targetCardinality: link.rightCardinality || '1',
      sourceProperty: link.leftProperty,
      targetProperty: link.rightProperty,
      direction: link.direction || 'default',
      renderType: (link.renderType as "bezier" | "orthogonal" | "linear") || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  const save = function(link: DomainLink): void {
    const schemaId = getSchemaId(instanceId);
    const schema = getActiveSchema(instanceId, schemaId);
    const exists = schema?.links.some((l) => l.id === link.id);

    if (exists) {
      store.dispatch({
        type: 'link-updated',
        schema_id: schemaId,
        link: {
          id: link.id,
          leftAnchorId: link.sourceAnchorId,
          rightAnchorId: link.targetAnchorId,
          leftEntityId: link.sourceEntityId,
          rightEntityId: link.targetEntityId,
          leftCardinality: (link.sourceCardinality || '1') as '1' | '*' | '0..1' | '1..*',
          rightCardinality: (link.targetCardinality || '1') as '1' | '*' | '0..1' | '1..*',
          renderType: (link.renderType as "bezier" | "orthogonal" | "linear") || 'bezier',
          ...(link.sourceProperty ? { leftProperty: link.sourceProperty } : {}),
          ...(link.targetProperty ? { rightProperty: link.targetProperty } : {}),
          ...(link.direction ? { direction: link.direction } : {})
        } as unknown as any
      });
    } else {
      store.dispatch({
        type: 'link-created',
        schema_id: schemaId,
        link_id: link.id,
        from_id: link.sourceEntityId,
        to_id: link.targetEntityId,
        from_anchor: link.sourceAnchorId,
        to_anchor: link.targetAnchorId,
        leftCardinality: link.sourceCardinality,
        rightCardinality: link.targetCardinality,
        leftProperty: link.sourceProperty,
        rightProperty: link.targetProperty,
        direction: link.direction || 'default',
        renderType: (link.renderType as "bezier" | "orthogonal" | "linear") || 'bezier'
      } as any);
    }
  };

  const remove = function(id: string): void {
    store.dispatch({
      type: 'link-removed',
      schema_id: getSchemaId(instanceId),
      link_id: id
    });
  };

  const getAll = function(): readonly DomainLink[] {
    const schema = getActiveSchema(instanceId, getSchemaId(instanceId));
    if (!schema) return [];

    return schema.links.map((l: any) => ({
      id: l.id,
      sourceAnchorId: l.leftAnchorId || 'center',
      targetAnchorId: l.rightAnchorId || 'center',
      sourceEntityId: l.leftEntityId,
      targetEntityId: l.rightEntityId,
      sourceCardinality: l.leftCardinality || '1',
      targetCardinality: l.rightCardinality || '1',
      sourceProperty: l.leftProperty,
      targetProperty: l.rightProperty,
      direction: l.direction || 'default',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  };

  return { getById, save, remove, getAll };
};

export { createEventBus } from './create-event-bus.js'
