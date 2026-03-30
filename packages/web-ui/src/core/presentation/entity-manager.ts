/**
 * Presentation Layer - Clean Facade for UI Components
 * Provides simple interface hiding architectural complexity
 */
import type { Property } from '@vbs/vbs-mod'
import type { ApplicationEvent } from '../application/entity-service.js'
import { createEntityApplicationService } from '../application/entity-service.js'
import type { DomainEntity, DomainLink, EntityDimensions, EntityPosition } from '../domain/entity-aggregate.js'
import { createEventBus, createPersistedEntityRepository, createPersistedLinkRepository } from '../infrastructure/entity-repository.js'

// Simplified UI Interface - Hide CQRS complexity  
export interface EntityManager {
  // Entity Commands (UI Actions)
  readonly createEntity: (id: string, name: string, position?: EntityPosition, dimensions?: EntityDimensions, metadata?: { shape?: string; color?: string; description?: string }) => void;
  readonly moveEntity: (entityId: string, position: EntityPosition) => void;
  readonly resizeEntity: (entityId: string, dimensions: EntityDimensions) => void;
  readonly updateEntityProperties: (entityId: string, properties: readonly Property[]) => void;
  readonly updateEntityName: (entityId: string, name: string) => void;
  readonly updateEntityMetadata: (entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }) => void;
  readonly removeEntity: (entityId: string) => void;
  
  // Entity Queries (UI Data)
  readonly getEntity: (entityId: string) => DomainEntity | undefined;
  readonly getAllEntities: () => readonly DomainEntity[];
  
  // Link Commands (UI Actions)
  readonly createLink: (id: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string) => void;
  readonly updateLinkProperties: (linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; }) => void;
  readonly updateLinkEndpoints: (linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string) => void;
  readonly removeLink: (linkId: string) => void;
  
  // Link Queries (UI Data)
  readonly getLink: (linkId: string) => DomainLink | undefined;
  readonly getAllLinks: () => readonly DomainLink[];
  
  // Events (UI Reactions)  
  readonly onApplicationEvent: (handler: (event: ApplicationEvent) => void) => () => void;
  
  // Redux DevTools Integration
  readonly connectDevTools: () => void;
  readonly cleanup: () => void;
}

// Redux DevTools Support
interface ReduxDevToolsConnection {
  send(action: any, state: any): void;
  init(state: any): void;
}

interface ReduxDevToolsExtension {
  connect(options?: any): ReduxDevToolsConnection;
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension;
  }
}

export const createEntityManager = function(): EntityManager {
  // Wire up clean architecture layers
  const repository = createPersistedEntityRepository();
  const linkRepository = createPersistedLinkRepository();
  const eventBus = createEventBus(); 
  const applicationService = createEntityApplicationService(repository, linkRepository, eventBus);
  
  let devToolsConnection: ReduxDevToolsConnection | null = null;
  let eventUnsubscribe: (() => void) | null = null;
  
  // Simplified Command Interface
  const createEntity = function(
    id: string, 
    name: string, 
    position?: EntityPosition, 
    dimensions?: EntityDimensions,
    metadata?: { shape?: string; color?: string; description?: string }
  ): void {
    applicationService.executeCommand({
      type: 'CreateEntity',
      id,
      name,
      position: position || { x: 0, y: 0 },
      dimensions: dimensions || { width: 200, height: 100 },
      ...(metadata ? { metadata } : {}) // fix for undefined assignment
    });
  };
  
  const moveEntity = function(entityId: string, position: EntityPosition): void {
    applicationService.executeCommand({
      type: 'MoveEntity',
      entityId,
      position
    });
  };
  
  const resizeEntity = function(entityId: string, dimensions: EntityDimensions): void {
    applicationService.executeCommand({
      type: 'ResizeEntity', 
      entityId,
      dimensions
    });
  };
  
  const updateEntityProperties = function(entityId: string, properties: readonly Property[]): void {
    applicationService.executeCommand({
      type: 'UpdateEntityProperties',
      entityId, 
      properties
    });
  };
  
  const updateEntityName = function(entityId: string, name: string): void {
    applicationService.executeCommand({
      type: 'UpdateEntityName',
      entityId,
      name
    });
  };

  const updateEntityMetadata = function(entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }): void {
    applicationService.executeCommand({
      type: 'UpdateEntityMetadata',
      entityId,
      metadata
    });
  };
  
  const removeEntity = function(entityId: string): void {
    applicationService.executeCommand({
      type: 'RemoveEntity',
      entityId
    });
  };
  
  // Simplified Link Command Interface
  const createLink = function(
    id: string,
    sourceAnchorId: string,
    targetAnchorId: string,
    sourceEntityId: string,
    targetEntityId: string
  ): void {
    console.log('[ENTITY-MANAGER] 🔗 Creating link:', { id, sourceAnchorId, targetAnchorId, sourceEntityId, targetEntityId });
    applicationService.executeCommand({
      type: 'CreateLink',
      id,
      sourceAnchorId,
      targetAnchorId,
      sourceEntityId,
      targetEntityId
    });
    console.log('[ENTITY-MANAGER] ✅ Link command executed');
  };
  
  const updateLinkProperties = function(linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; }): void {
    applicationService.executeCommand({
      type: 'UpdateLinkProperties',
      linkId,
      properties
    });
  };

  const updateLinkEndpoints = function(linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string): void {
    applicationService.executeCommand({
      type: 'UpdateLinkEndpoints',
      linkId,
      sourceAnchorId,
      targetAnchorId,
      sourceEntityId,
      targetEntityId
    });
  };

  const removeLink = function(linkId: string): void {
    applicationService.executeCommand({
      type: 'RemoveLink',
      linkId
    });
  };
  
  // Simplified Query Interface
  const getEntity = function(entityId: string): DomainEntity | undefined {
    const entity = applicationService.executeQuery({ type: 'GetEntity', entityId });
    console.log('[ENTITY-MANAGER] 🔍 Get entity:', entityId, '→', entity ? 'FOUND' : 'NOT FOUND');
    if (entity) {
      console.log('[ENTITY-MANAGER] 📄 Found entity details:', { id: entity.id, name: entity.name, position: entity.position });
    }
    return entity;
  };
  
  const getAllEntities = function(): readonly DomainEntity[] {
    const entities = applicationService.executeQuery({ type: 'GetAllEntities' });
    console.log('[ENTITY-MANAGER] 📋 Get all entities:', entities.length, 'total');
    entities.forEach(e => console.log('[ENTITY-MANAGER] 📄 Entity:', e.id, 'at', e.position));
    return entities;
  };
  
  // Simplified Link Query Interface
  const getLink = function(linkId: string): DomainLink | undefined {
    const link = applicationService.executeQuery({ type: 'GetLink', linkId });
    console.log('[ENTITY-MANAGER] 🔍 Get link:', linkId, '→', link);
    return link;
  };
  
  const getAllLinks = function(): readonly DomainLink[] {
    const links = applicationService.executeQuery({ type: 'GetAllLinks' });
    console.log('[ENTITY-MANAGER] 📋 Get all links:', links.length, 'found');
    return links;
  };
  
  // Event Subscription
  const onApplicationEvent = function(handler: (event: ApplicationEvent) => void): () => void {
    return eventBus.subscribe(handler);
  };
  
  // Redux DevTools Integration  
  const connectDevTools = function(): void {
    if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
      devToolsConnection = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
        name: 'VBE2 Entity Manager',
        trace: true,
        traceLimit: 25
      });
      
      // Initialize with current state
      const initialState = { 
        entities: getAllEntities(),
        links: getAllLinks()
      };
      devToolsConnection.init(initialState);
      console.log('🔧 Redux DevTools connected to EntityManager');
      
      // Subscribe to events and send to DevTools
      eventUnsubscribe = eventBus.subscribe((event: ApplicationEvent) => {
        if (devToolsConnection) {
          const currentState = { 
            entities: getAllEntities(),
            links: getAllLinks()
          };
          devToolsConnection.send(event, currentState);
        }
      });
    }
  };
  
  const cleanup = function(): void {
    if (eventUnsubscribe) {
      eventUnsubscribe();
      eventUnsubscribe = null;
    }
    devToolsConnection = null;
  };
  
  return {
    createEntity,
    moveEntity, 
    resizeEntity,
    updateEntityProperties,
    updateEntityName,
    updateEntityMetadata,
    removeEntity,
    getEntity,
    getAllEntities,
    createLink,
    updateLinkProperties,
    updateLinkEndpoints,
    removeLink,
    getLink,
    getAllLinks,
    onApplicationEvent,
    connectDevTools,
    cleanup
  };
};

// Singleton Pattern for Global Access
let globalEntityManager: EntityManager | null = null;

export const getEntityManager = function(): EntityManager {
  if (!globalEntityManager) {
    globalEntityManager = createEntityManager();
    globalEntityManager.connectDevTools();
  }
  return globalEntityManager;
};