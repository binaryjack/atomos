/**
 * Canvas Integration Adapter
 * Connects clean architecture to existing canvas components
 */
import type { ApplicationEvent } from '../application/entity-service.js'
import type { DomainEntity } from '../domain/entity-aggregate.js'
import { getEntityManager } from '../presentation/entity-manager.js'
import type { ViewEvent } from '../view/canvas-view-store.js'
import { createCanvasViewStore } from '../view/canvas-view-store.js'

export interface CanvasAdapter {
  // Entity Operations (Domain)
  readonly createEntity: (id: string, name: string, x?: number, y?: number, width?: number, height?: number, metadata?: { shape?: string; color?: string; description?: string }) => void;
  readonly moveEntity: (entityId: string, x: number, y: number) => void;
  readonly resizeEntity: (entityId: string, width: number, height: number) => void;
  readonly updateEntityProperties: (entityId: string, properties: any[]) => void;
  readonly updateEntityName: (entityId: string, name: string) => void;  readonly updateEntityMetadata: (entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }) => void;  readonly removeEntity: (entityId: string) => void;
  readonly getEntity: (entityId: string) => DomainEntity | undefined;
  readonly getAllEntities: () => readonly DomainEntity[];
  
  // Link Operations (Domain)
  readonly createLink: (id: string, sourceAnchorId: string, targetAnchorId: string, leftEntityId: string, rightEntityId: string) => void;
  readonly updateLinkProperties: (linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; }) => void;
  readonly updateLinkEndpoints: (linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getLink: (linkId: string) => any | undefined;
  readonly getAllLinks: () => readonly any[];
  
  // View Operations (UI State)
  readonly setViewport: (zoom?: number, panX?: number, panY?: number) => void;
  readonly selectEntity: (entityId: string | null) => void;
  readonly getViewport: () => { zoom: number; panX: number; panY: number };
  readonly getSelectedEntityId: () => string | null;
  
  // Event Subscriptions
  readonly onEntityChanged: (handler: (event: ApplicationEvent) => void) => () => void;
  readonly onViewChanged: (handler: (event: ViewEvent) => void) => () => void;
  
  // Canvas State for Existing Components
  readonly getCanvasState: () => {
    entities: Record<string, any>;
    viewport: { zoom: number; panX: number; panY: number };
    selectedEntityId: string | null;
  };
}

export const createCanvasAdapter = function(): CanvasAdapter {
  const entityManager = getEntityManager();
  const viewStore = createCanvasViewStore();
  
  // Entity Operations - Delegate to Domain Layer
  const createEntity = function(id: string, name: string, x = 100, y = 100, width?: number, height?: number, metadata?: { shape?: string; color?: string; description?: string }): void {
    entityManager.createEntity(id, name, { x, y }, width && height ? { width, height } : undefined, metadata);
  };
  
  const moveEntity = function(entityId: string, x: number, y: number): void {
    entityManager.moveEntity(entityId, { x, y });
  };
  
  const resizeEntity = function(entityId: string, width: number, height: number): void {
    entityManager.resizeEntity(entityId, { width, height });
  };
  
  const updateEntityProperties = function(entityId: string, properties: any[]): void {
    entityManager.updateEntityProperties(entityId, properties);
  };
  
  const updateEntityName = function(entityId: string, name: string): void {
    entityManager.updateEntityName(entityId, name);
  };
  
  const updateEntityMetadata = function(entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }): void {
    entityManager.updateEntityMetadata(entityId, metadata);
  };

  const removeEntity = function(entityId: string): void {
    entityManager.removeEntity(entityId);
  };
  
  const getEntity = function(entityId: string): DomainEntity | undefined {
    const entity = entityManager.getEntity(entityId);
    console.log('[CANVAS-ADAPTER] 🔍 Get entity:', entityId, '→', entity ? 'FOUND' : 'NOT FOUND');
    if (entity) {
      console.log('[CANVAS-ADAPTER] 📄 Entity details:', { id: entity.id, position: entity.position, dimensions: entity.dimensions });
    }
    return entity;
  };
  const getAllEntities = function(): readonly DomainEntity[] {
    const entities = entityManager.getAllEntities();
    console.log('[CANVAS-ADAPTER] 📋 Get all entities:', entities.length, 'total');
    entities.forEach(e => console.log('[CANVAS-ADAPTER] 📄 Entity in list:', e.id));
    return entities;
  };
  
  // Link Operations - Delegate to Domain Layer
  const createLink = function(id: string, sourceAnchorId: string, targetAnchorId: string, leftEntityId: string, rightEntityId: string): void {
    console.log('[CANVAS-ADAPTER] 🔗 Creating link via clean architecture:', { id, sourceAnchorId, targetAnchorId, leftEntityId, rightEntityId });
    entityManager.createLink(id, sourceAnchorId, targetAnchorId, leftEntityId, rightEntityId);
    console.log('[CANVAS-ADAPTER] ✅ Link creation delegated to entity manager');
  };
  
  const updateLinkProperties = function(linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; }): void {
    console.log('[CANVAS-ADAPTER] 🔄 Updating link properties:', { linkId, properties });
    entityManager.updateLinkProperties(linkId, properties);
  };

  const updateLinkEndpoints = function(linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string): void {
    console.log('[CANVAS-ADAPTER] 🔄 Updating link endpoints for reconnect:', { linkId, sourceAnchorId, targetAnchorId, sourceEntityId, targetEntityId });
    entityManager.updateLinkEndpoints(linkId, sourceAnchorId, targetAnchorId, sourceEntityId, targetEntityId);
  };

  const removeLink = function(linkId: string): void {
    console.log('[CANVAS-ADAPTER] 🗑️ Removing link via clean architecture:', linkId);
    entityManager.removeLink(linkId);
  };
  
  const getLink = function(linkId: string): any | undefined {
    return entityManager.getLink(linkId);
  };

  const getAllLinks = function(): readonly any[] {
    const links = entityManager.getAllLinks();
    console.log('[CANVAS-ADAPTER] 📋 Getting all links via clean architecture:', links.length, 'found');
    return links;
  };
  
  // View Operations - Delegate to View Layer
  const setViewport = function(zoom?: number, panX?: number, panY?: number): void {
    const viewport: any = {};
    if (zoom !== undefined) viewport.zoom = zoom;
    if (panX !== undefined) viewport.panX = panX;
    if (panY !== undefined) viewport.panY = panY;
    
    viewStore.dispatch({ type: 'SetViewport', viewport });
  };
  
  const selectEntity = function(entityId: string | null): void {
    viewStore.dispatch({ type: 'SelectEntity', entityId });
  };
  
  const getViewport = function() {
    return viewStore.getState().viewport;
  };
  
  const getSelectedEntityId = function() {
    return viewStore.getState().selection.selectedEntityId;
  };
  
  // Event Subscriptions
  const onEntityChanged = entityManager.onApplicationEvent;
  const onViewChanged = viewStore.onViewEvent;
  
  // Legacy Canvas State Adapter - For Existing Components
  const getCanvasState = function() {
    const entities = getAllEntities();
    const viewport = getViewport();
    const selectedEntityId = getSelectedEntityId();
    
    // Transform domain entities to canvas format
    const canvasEntities: Record<string, any> = {};
    entities.forEach(entity => {
      canvasEntities[entity.id] = {
        id: entity.id,
        position: entity.position,
        dimensions: entity.dimensions,
        data: { 
          name: entity.name,
          properties: entity.properties
        }
      };
    });
    
    return {
      entities: canvasEntities,
      viewport,
      selectedEntityId
    };
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
    setViewport,
    selectEntity,
    getViewport,
    getSelectedEntityId,
    onEntityChanged,
    onViewChanged,
    getCanvasState
  };
};

// Global Singleton for Easy Access
let globalCanvasAdapter: CanvasAdapter | null = null;

export const getCanvasAdapter = function(): CanvasAdapter {
  if (!globalCanvasAdapter) {
    globalCanvasAdapter = createCanvasAdapter();
    console.log('🏗️ Clean Architecture Canvas Adapter initialized');
  }
  return globalCanvasAdapter;
};