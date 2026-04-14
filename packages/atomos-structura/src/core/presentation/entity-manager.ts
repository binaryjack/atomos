/**
 * Presentation Layer - Clean Facade for UI Components
 * Provides simple interface hiding architectural complexity
 */
import type { Property } from '@atomos-web/structura-core'
import { getGeneralSettings } from '../adapters/toolbox-config-manager.js'
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
  readonly updateEntityCollapse: (entityId: string, collapsed: boolean) => void;
  readonly updateEntityMetadata: (entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }) => void;
  readonly removeEntity: (entityId: string) => void;
  
  // Entity Queries (UI Data)
  readonly getEntity: (entityId: string) => DomainEntity | undefined;
  readonly getAllEntities: () => readonly DomainEntity[];
  
  // Link Commands (UI Actions)
  readonly createLink: (id: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string) => void;
  readonly updateLinkProperties: (linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; renderType?: string | undefined; }) => void;
  readonly updateLinkEndpoints: (linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string) => void;
  readonly removeLink: (linkId: string) => void;
  
  // Link Queries (UI Data)
  readonly getLink: (linkId: string) => DomainLink | undefined;
  readonly getAllLinks: () => readonly DomainLink[];
  
  // Events (UI Reactions)  
  readonly onApplicationEvent: (handler: (event: ApplicationEvent) => void) => () => void;
  
  // Re-announce to DOM without writing to Redux (used by reconcile on tab switch / undo)
  readonly reannounceEntity: (entityId: string) => void;
  readonly reannounceLink: (linkId: string) => void;

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

  const updateEntityCollapse = function(entityId: string, collapsed: boolean): void {
    applicationService.executeCommand({
      type: 'UpdateEntityCollapse',
      entityId,
      collapsed
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
    const settings = getGeneralSettings();
    applicationService.executeCommand({
      type: 'CreateLink',
      id,
      sourceAnchorId,
      targetAnchorId,
      sourceEntityId,
      targetEntityId,
      renderType: settings?.defaultLinkStyle
    });
    console.log('[ENTITY-MANAGER] ✅ Link command executed');
  };
  
  const updateLinkProperties = function(linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; renderType?: string | undefined; }): void {
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
    return applicationService.executeQuery({ type: 'GetEntity', entityId });
  };
  
  const getAllEntities = function(): readonly DomainEntity[] {
    return applicationService.executeQuery({ type: 'GetAllEntities' });
  };
  
  // Simplified Link Query Interface
  const getLink = function(linkId: string): DomainLink | undefined {
    return applicationService.executeQuery({ type: 'GetLink', linkId });
  };
  
  const getAllLinks = function(): readonly DomainLink[] {
    return applicationService.executeQuery({ type: 'GetAllLinks' });
  };
  
  // Event Subscription
  const onApplicationEvent = function(handler: (event: ApplicationEvent) => void): () => void {
    return eventBus.subscribe(handler);
  };

  // Re-announce entity to DOM without writing to Redux
  const reannounceEntity = function(entityId: string): void {
    const entity = repository.getById(entityId);
    if (entity) eventBus.publish({ type: 'EntityCreated', entity });
  };

  // Re-announce link to DOM without writing to Redux
  const reannounceLink = function(linkId: string): void {
    const link = linkRepository.getById(linkId);
    if (link) eventBus.publish({ type: 'LinkCreated', link });
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
    updateEntityCollapse,
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
    reannounceEntity,
    reannounceLink,
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
