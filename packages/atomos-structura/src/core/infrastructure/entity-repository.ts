/**
 * Infrastructure Layer - Repository Implementation
 * Handles persistence through the Global Redux Store
 */
import type { DomainEntity, DomainLink, EntityRepository, LinkRepository } from '../domain/entity-aggregate.js';
import { getGlobalReduxStore } from '../create-redux-store.js';

const SCHEMA_ID = 'schema-default';

export const createPersistedEntityRepository = function(): EntityRepository {
  const store = getGlobalReduxStore();

  const getById = function(id: string): DomainEntity | undefined {
    const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
    if (!schema) return undefined;
    return schema.entities.find((e: any) => e.id === id) as unknown as DomainEntity;
  };

  const save = function(entity: DomainEntity): void {
    const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
    const exists = schema?.entities.some((e: any) => e.id === entity.id);

    // Convert DomainEntity to Entity
    const reduxEntity = {
      ...entity,
      code: entity.name, // Fallback if necessary
      edges: []          // Default requirement for Redux 'Entity' type
    } as any;

    if (exists) {
      store.dispatch({
        type: 'entity-updated',
        schema_id: SCHEMA_ID,
        entity: reduxEntity
      });
    } else {
      store.dispatch({
        type: 'entity-added',
        schema_id: SCHEMA_ID,
        entity: reduxEntity
      });
    }
  };

  const remove = function(id: string): void {
    store.dispatch({ type: 'entity-removed', schema_id: SCHEMA_ID, entity_id: id });
  };

  const getAll = function(): readonly DomainEntity[] {
    const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
    if (!schema) return [];
    return schema.entities as unknown as DomainEntity[];
  };

  return { getById, save, remove, getAll };
};

export const createPersistedLinkRepository = function(): LinkRepository {
  const store = getGlobalReduxStore();

  const getById = function(id: string): DomainLink | undefined {
    const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
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
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  };

  const save = function(link: DomainLink): void {
    const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
    const exists = schema?.links.some((l: any) => l.id === link.id);

    if (exists) {
      store.dispatch({
        type: 'link-updated',
        schema_id: SCHEMA_ID,
        link: {
          id: link.id,
          leftAnchorId: link.sourceAnchorId,
          rightAnchorId: link.targetAnchorId,
          leftEntityId: link.sourceEntityId,
          rightEntityId: link.targetEntityId,
          leftCardinality: (link.sourceCardinality || '1') as '1' | '*' | '0..1' | '1..*',
          rightCardinality: (link.targetCardinality || '1') as '1' | '*' | '0..1' | '1..*',
          renderType: 'bezier',
          ...(link.sourceProperty ? { leftProperty: link.sourceProperty } : {}),
          ...(link.targetProperty ? { rightProperty: link.targetProperty } : {})
        } as unknown as any
      });
    } else {
      store.dispatch({
        type: 'link-created',
        schema_id: SCHEMA_ID,
        link_id: link.id,
        from_id: link.sourceEntityId,
        to_id: link.targetEntityId,
        from_anchor: link.sourceAnchorId,
        to_anchor: link.targetAnchorId,
        leftCardinality: link.sourceCardinality,
        rightCardinality: link.targetCardinality,
        leftProperty: link.sourceProperty,
        rightProperty: link.targetProperty
      } as any);
    }
  };

  const remove = function(id: string): void {
    store.dispatch({
      type: 'link-removed',
      schema_id: SCHEMA_ID,
      link_id: id
    });
  };

  const getAll = function(): readonly DomainLink[] {
    const state = store.get_state();
    const schema = state.schemas[SCHEMA_ID];
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
      createdAt: Date.now(),
      updatedAt: Date.now()
    }));
  };

  return { getById, save, remove, getAll };
};

/**
 * Simple Event Bus Implementation
 * Decouples components with pub/sub pattern
 */
import type { ApplicationEvent, EventBus } from '../application/entity-service.js';

export const createEventBus = function(): EventBus {
  const handlers = new Set<(event: ApplicationEvent) => void>();

  const publish = function(event: ApplicationEvent): void {
    console.log(`[EventBus] Publishing ${event.type}:`, event);

    // Handle events asynchronously to prevent cascading updates
    setTimeout(() => {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Handler failed for ${event.type}:`, error);
        }
      });
    }, 0);
  };

  const subscribe = function(handler: (event: ApplicationEvent) => void): () => void {
    handlers.add(handler);
    console.log(`[EventBus] Subscribed handler (total: ${handlers.size})`);

    return function unsubscribe() {
      handlers.delete(handler);
      console.log(`[EventBus] Unsubscribed handler (total: ${handlers.size})`);
    };
  };

  return { publish, subscribe };
};
