/**
 * Application Layer - Use Cases & Commands  
 * Orchestrates domain logic with clean command/query separation
 */
import type { Property } from '@atomos-web/structura-core'
import type { DomainEntity, DomainLink, EntityDimensions, EntityPosition, EntityRepository, LinkRepository } from '../domain/entity-aggregate.js'
import { createEntityAggregate, createLinkAggregate, moveEntity, resizeEntity, updateEntityMetadata, updateEntityName, updateEntityProperties, updateLinkEndpoints, updateLinkProperties } from '../domain/entity-aggregate.js'

// ...
export interface CreateEntityCommand {
  readonly type: 'CreateEntity';
  readonly id: string;
  readonly name: string;
  readonly position?: EntityPosition;
  readonly dimensions?: EntityDimensions;  readonly metadata?: {
    readonly shape?: string;
    readonly color?: string;
    readonly description?: string;
  };}

export interface MoveEntityCommand {
  readonly type: 'MoveEntity';
  readonly entityId: string;
  readonly position: EntityPosition;
}

export interface ResizeEntityCommand {
  readonly type: 'ResizeEntity'; 
  readonly entityId: string;
  readonly dimensions: EntityDimensions;
}

export interface UpdateEntityPropertiesCommand {
  readonly type: 'UpdateEntityProperties';
  readonly entityId: string;
  readonly properties: readonly Property[];
}

export interface UpdateEntityNameCommand {
  readonly type: 'UpdateEntityName';
  readonly entityId: string;
  readonly name: string;
}

export interface UpdateEntityCollapseCommand {
  readonly type: 'UpdateEntityCollapse';
  readonly entityId: string;
  readonly collapsed: boolean;
}

export interface UpdateEntityMetadataCommand {
  readonly type: 'UpdateEntityMetadata';
  readonly entityId: string;
  readonly metadata: {
    readonly name?: string;
    readonly description?: string;
    readonly shape?: string;
    readonly color?: string;
  };
}

export interface RemoveEntityCommand {
  readonly type: 'RemoveEntity';
  readonly entityId: string;
}

export type EntityCommand = 
  | CreateEntityCommand
  | MoveEntityCommand 
  | ResizeEntityCommand
  | UpdateEntityPropertiesCommand
  | UpdateEntityNameCommand
  | UpdateEntityCollapseCommand
  | UpdateEntityMetadataCommand
  | RemoveEntityCommand;

// Queries (Read Operations)
export interface GetEntityQuery {
  readonly type: 'GetEntity';
  readonly entityId: string;
}

export interface GetAllEntitiesQuery {
  readonly type: 'GetAllEntities';
}

export type EntityQuery = GetEntityQuery | GetAllEntitiesQuery;

// Link Commands (Write Operations)
export interface CreateLinkCommand {
  readonly type: 'CreateLink';
  readonly id: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly sourceCardinality?: string | undefined;
  readonly targetCardinality?: string | undefined;
  readonly sourceProperty?: string | undefined;
  readonly targetProperty?: string | undefined;
  readonly renderType?: string | undefined;
}

export interface RemoveLinkCommand {
  readonly type: 'RemoveLink';
  readonly linkId: string;
}

export interface UpdateLinkPropertiesCommand {
  readonly type: 'UpdateLinkProperties';
  readonly linkId: string;
  readonly properties: {
    readonly sourceCardinality?: string | undefined;
    readonly targetCardinality?: string | undefined;
    readonly sourceProperty?: string | undefined;
    readonly targetProperty?: string | undefined;
    readonly renderType?: string | undefined;
  };
}

export interface UpdateLinkEndpointsCommand {
  readonly type: 'UpdateLinkEndpoints';
  readonly linkId: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
}

export type LinkCommand = CreateLinkCommand | RemoveLinkCommand | UpdateLinkPropertiesCommand | UpdateLinkEndpointsCommand;

// Link Queries (Read Operations)
export interface GetLinkQuery {
  readonly type: 'GetLink';
  readonly linkId: string;
}

export interface GetAllLinksQuery {
  readonly type: 'GetAllLinks';
}

export type LinkQuery = GetLinkQuery | GetAllLinksQuery;

// Event System for UI Updates
export interface EntityCreatedEvent {
  readonly type: 'EntityCreated';
  readonly entity: DomainEntity;
}

export interface EntityMovedEvent {
  readonly type: 'EntityMoved';
  readonly entityId: string;
  readonly position: EntityPosition;
}

export interface EntityResizedEvent {
  readonly type: 'EntityResized';
  readonly entityId: string;
  readonly dimensions: EntityDimensions;
}

export interface EntityPropertiesUpdatedEvent {
  readonly type: 'EntityPropertiesUpdated';
  readonly entityId: string;
  readonly properties: readonly Property[];
}

export interface EntityNameUpdatedEvent {
  readonly type: 'EntityNameUpdated';
  readonly entityId: string;
  readonly name: string;
}

export interface EntityCollapseUpdatedEvent {
  readonly type: 'EntityCollapseUpdated';
  readonly entityId: string;
  readonly collapsed: boolean;
}

export interface EntityMetadataUpdatedEvent {
  readonly type: 'EntityMetadataUpdated';
  readonly entityId: string;
  readonly metadata: {
    readonly name?: string;
    readonly description?: string;
    readonly shape?: string;
    readonly color?: string;
  };
}

export interface EntityRemovedEvent {
  readonly type: 'EntityRemoved';
  readonly entityId: string;
}

export type EntityEvent = 
  | EntityCreatedEvent
  | EntityMovedEvent
  | EntityResizedEvent 
  | EntityPropertiesUpdatedEvent
  | EntityNameUpdatedEvent
  | EntityCollapseUpdatedEvent
  | EntityMetadataUpdatedEvent
  | EntityRemovedEvent;

// Link Event System for UI Updates
export interface LinkCreatedEvent {
  readonly type: 'LinkCreated';
  readonly link: DomainLink;
}

export interface LinkRemovedEvent {
  readonly type: 'LinkRemoved';
  readonly linkId: string;
}

export interface LinkPropertiesUpdatedEvent {
  readonly type: 'LinkPropertiesUpdated';
  readonly linkId: string;
  readonly properties: {
    readonly sourceCardinality?: string | undefined;
    readonly targetCardinality?: string | undefined;
    readonly sourceProperty?: string | undefined;
    readonly targetProperty?: string | undefined;
    readonly renderType?: string | undefined;
  };
}

export type LinkEvent = LinkCreatedEvent | LinkRemovedEvent | LinkPropertiesUpdatedEvent;

export type ApplicationEvent = EntityEvent | LinkEvent;

export interface EventBus {
  readonly publish: (event: ApplicationEvent) => void;
  readonly subscribe: (handler: (event: ApplicationEvent) => void) => () => void;
}

// Application Service - Orchestrates Commands
export interface EntityApplicationService {
  readonly executeCommand: (command: EntityCommand | LinkCommand) => void;
  readonly executeQuery: <T extends EntityQuery | LinkQuery>(
    query: T
  ) => T extends GetEntityQuery 
    ? DomainEntity | undefined 
    : T extends GetAllEntitiesQuery 
      ? readonly DomainEntity[] 
      : T extends GetLinkQuery
        ? DomainLink | undefined
        : T extends GetAllLinksQuery
          ? readonly DomainLink[]
          : never;
}

export const createEntityApplicationService = function(
  repository: EntityRepository,
  linkRepository: LinkRepository,
  eventBus: EventBus
): EntityApplicationService {
  
  const executeCommand = function(command: EntityCommand | LinkCommand): void {
    switch (command.type) {
      case 'CreateEntity': {
        const entity = createEntityAggregate(
          command.id,
          command.name, 
          command.position,
          command.dimensions,
          command.metadata
        );
        repository.save(entity);
        eventBus.publish({ type: 'EntityCreated', entity });
        break;
      }
      
      case 'MoveEntity': {
        const entity = repository.getById(command.entityId);
        if (!entity) throw new Error(`Entity ${command.entityId} not found`);
        
        const movedEntity = moveEntity(entity, command.position);
        repository.save(movedEntity);
        eventBus.publish({ 
          type: 'EntityMoved', 
          entityId: command.entityId, 
          position: command.position 
        });
        break;
      }
      
      case 'ResizeEntity': {
        const entity = repository.getById(command.entityId);
        if (!entity) throw new Error(`Entity ${command.entityId} not found`);
        
        const resizedEntity = resizeEntity(entity, command.dimensions);
        repository.save(resizedEntity);
        eventBus.publish({
          type: 'EntityResized',
          entityId: command.entityId,
          dimensions: command.dimensions
        });
        break;
      }
      
      case 'UpdateEntityProperties': {
        const entity = repository.getById(command.entityId);
        if (!entity) throw new Error(`Entity ${command.entityId} not found`);
        
        const updatedEntity = updateEntityProperties(entity, command.properties);
        repository.save(updatedEntity);
        eventBus.publish({
          type: 'EntityPropertiesUpdated',
          entityId: command.entityId,
          properties: command.properties
        });
        break;
      }
      
      case 'UpdateEntityName': {
        const entity = repository.getById(command.entityId);
        if (!entity) throw new Error(`Entity ${command.entityId} not found`);
        
        const updatedEntity = updateEntityName(entity, command.name);
        repository.save(updatedEntity);
        eventBus.publish({
          type: 'EntityNameUpdated',
          entityId: command.entityId,
          name: command.name
        });
        break;
      }

      case 'UpdateEntityCollapse': {
        const entity = repository.getById(command.entityId);
        if (!entity) throw new Error(`Entity ${command.entityId} not found`);
        
        import('../domain/entity-aggregate.js').then(mod => {
          const updatedEntity = mod.updateEntityCollapse(entity, command.collapsed);
          repository.save(updatedEntity);
          eventBus.publish({
            type: 'EntityCollapseUpdated',
            entityId: command.entityId,
            collapsed: command.collapsed
          });
        });
        break;
      }
      
      case 'UpdateEntityMetadata': {
        const entity = repository.getById(command.entityId);
        if (!entity) throw new Error(`Entity ${command.entityId} not found`);
        
        const updatedEntity = updateEntityMetadata(entity, command.metadata);
        repository.save(updatedEntity);
        eventBus.publish({
          type: 'EntityMetadataUpdated',
          entityId: command.entityId,
          metadata: command.metadata
        });
        break;
      }
      
      case 'RemoveEntity': {
        const entity = repository.getById(command.entityId);
        if (!entity) break;
        repository.remove(command.entityId);
        eventBus.publish({
          type: 'EntityRemoved',
          entityId: command.entityId
        });
        break;
      }
      
      case 'CreateLink': {
        const link = createLinkAggregate(
          command.id,
          command.sourceAnchorId,
          command.targetAnchorId,
          command.sourceEntityId,
          command.targetEntityId,
          command.sourceCardinality,
          command.targetCardinality,
          command.sourceProperty,
          command.targetProperty,
          command.renderType
        );
        linkRepository.save(link);
        eventBus.publish({ type: 'LinkCreated', link });
        break;
      }

      case 'UpdateLinkProperties': {
        const link = linkRepository.getById(command.linkId);
        if (!link) throw new Error(`Link ${command.linkId} not found`);
        const updatedLink = updateLinkProperties(link, command.properties);
        linkRepository.save(updatedLink);
        eventBus.publish({
          type: 'LinkPropertiesUpdated',
          linkId: command.linkId,
          properties: command.properties
        });
        break;
      }

      case 'UpdateLinkEndpoints': {
        const link = linkRepository.getById(command.linkId);
        if (!link) throw new Error(`Link ${command.linkId} not found`);
        const updatedLink = updateLinkEndpoints(
          link,
          command.sourceAnchorId,
          command.targetAnchorId,
          command.sourceEntityId,
          command.targetEntityId
        );
        linkRepository.save(updatedLink);
        eventBus.publish({
          type: 'LinkPropertiesUpdated',
          linkId: command.linkId,
          properties: {}
        });
        break;
      }
      
      case 'RemoveLink': {
        const link = linkRepository.getById(command.linkId);
        if (!link) break;
        linkRepository.remove(command.linkId);
        eventBus.publish({
          type: 'LinkRemoved',
          linkId: command.linkId
        });
        break;
      }
      
      default: {
        const _exhaustive: never = command;
        throw new Error(`Unknown command type: ${(_exhaustive as { type: string }).type}`);
      }
    }
  };
  
  const executeQuery = function<T extends EntityQuery | LinkQuery>(query: T): any {
    switch (query.type) {
      case 'GetEntity':
        return repository.getById((query as GetEntityQuery).entityId);
        
      case 'GetAllEntities':
        return repository.getAll();
        
      case 'GetLink':
        return linkRepository.getById((query as GetLinkQuery).linkId);
        
      case 'GetAllLinks':
        return linkRepository.getAll();
        
      default: {
        const _exhaustive: never = query;
        throw new Error(`Unknown query type: ${(_exhaustive as { type: string }).type}`);
      }
    }
  };
  
  return { executeCommand, executeQuery };
};
