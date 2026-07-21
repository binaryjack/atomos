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
  readonly updateEntityName: (entityId: string, name: string) => void;
  readonly updateEntityCollapse: (entityId: string, collapsed: boolean) => void;
  readonly updateEntityMetadata: (entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }) => void;
  readonly removeEntity: (entityId: string) => void;
  readonly getEntity: (entityId: string) => DomainEntity | undefined;
  readonly getAllEntities: () => readonly DomainEntity[];
  
  // Link Operations (Domain)
  readonly createLink: (id: string, sourceAnchorId: string, targetAnchorId: string, leftEntityId: string, rightEntityId: string) => void;
  readonly updateLinkProperties: (linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; renderType?: string | undefined; direction?: 'default' | 'left' | 'right' | 'both' | undefined; }) => void;
  readonly updateLinkEndpoints: (linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getLink: (linkId: string) => any | undefined;
  readonly getAllLinks: () => readonly any[];
  
  // View Operations (UI State)
  readonly setViewport: (viewport: Partial<{ zoom: number; pan: { x: number; y: number } }>) => void;
  readonly selectEntity: (entityId: string | null) => void;
  readonly selectEntities: (entityIds: readonly string[]) => void;
  readonly getViewport: () => { zoom: number; pan: { x: number; y: number } };
  readonly getSelectedEntityId: () => string | null;
  
  // Event Subscriptions
  readonly onEntityChanged: (handler: (event: ApplicationEvent) => void) => () => void;
  readonly onViewChanged: (handler: (event: ViewEvent) => void) => () => void;
  
  // Canvas State for Existing Components
  readonly getCanvasState: () => {
    entities: Record<string, any>;
    viewport: { zoom: number; pan: { x: number; y: number } };
    selectedEntityId: string | null;
  };
}

export const createCanvasAdapter = function(instanceId: string): CanvasAdapter {
  const entityManager = getEntityManager(instanceId);
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
  
  const updateEntityCollapse = function(entityId: string, collapsed: boolean): void {
    entityManager.updateEntityCollapse(entityId, collapsed);
  };
  
  const updateEntityMetadata = function(entityId: string, metadata: { name?: string; description?: string; shape?: string; color?: string }): void {
    entityManager.updateEntityMetadata(entityId, metadata);
  };

  const removeEntity = function(entityId: string): void {
    entityManager.removeEntity(entityId);
  };
  
  const getEntity = function(entityId: string): DomainEntity | undefined {
    const entity = entityManager.getEntity(entityId);
    return entity;
  };
  const getAllEntities = function(): readonly DomainEntity[] {
    const entities = entityManager.getAllEntities();
    return entities;
  };
  
  // Link Operations - Delegate to Domain Layer
  const createLink = function(id: string, sourceAnchorId: string, targetAnchorId: string, leftEntityId: string, rightEntityId: string): void {
    entityManager.createLink(id, sourceAnchorId, targetAnchorId, leftEntityId, rightEntityId);
  };
  
  const updateLinkProperties = function(linkId: string, properties: { sourceCardinality?: string | undefined; targetCardinality?: string | undefined; sourceProperty?: string | undefined; targetProperty?: string | undefined; renderType?: string | undefined; direction?: 'default' | 'left' | 'right' | 'both' | undefined; }): void {
    entityManager.updateLinkProperties(linkId, properties);
  };

  const updateLinkEndpoints = function(linkId: string, sourceAnchorId: string, targetAnchorId: string, sourceEntityId: string, targetEntityId: string): void {
    entityManager.updateLinkEndpoints(linkId, sourceAnchorId, targetAnchorId, sourceEntityId, targetEntityId);
  };

  const removeLink = function(linkId: string): void {
    entityManager.removeLink(linkId);
  };
  
  const getLink = function(linkId: string): any | undefined {
    return entityManager.getLink(linkId);
  };

  const getAllLinks = function(): readonly any[] {
    const links = entityManager.getAllLinks();
    return links;
  };
  
  // View Operations - Delegate to View Layer
  const setViewport = function(viewport: Partial<{ zoom: number; pan: { x: number; y: number } }>): void {
    viewStore.dispatch({ type: 'SetViewport', viewport });
  };
  
  const selectEntity = function(entityId: string | null) {
    viewStore.dispatch({ type: 'SelectEntity', entityId });
  };
  
  const selectEntities = function(entityIds: readonly string[]) {
    viewStore.dispatch({ type: 'SetMultiSelection', entityIds: [...entityIds] });
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
    setViewport,
    selectEntity,
    selectEntities,
    getViewport,
    getSelectedEntityId,
    onEntityChanged,
    onViewChanged,
    getCanvasState
  };
};

// Per-schema adapter registry — keyed by schema ID.
// Use getCanvasAdapterFor(schemaId) in all application code.
const adapterRegistry = new Map<string, CanvasAdapter>();

/** Returns the adapter bound to the given instance and schema ID, creating it on first access. */
export const getCanvasAdapterFor = function(instanceId: string, schemaId: string): CanvasAdapter {
  const key = `${instanceId}:${schemaId}`;
  let adapter = adapterRegistry.get(key);
  if (!adapter) {
    adapter = createCanvasAdapter(instanceId);
    adapterRegistry.set(key, adapter);
    console.log(`🏗️ Canvas adapter created for instance: ${instanceId}, schema: ${schemaId}`);
  }
  return adapter;
};

/** Releases the adapter for a schema (call when a schema tab is closed / schema deleted). */
export const destroyCanvasAdapter = function(instanceId: string, schemaId: string): void {
  const key = `${instanceId}:${schemaId}`;
  adapterRegistry.delete(key);
  console.log(`🗑️ Canvas adapter destroyed for instance: ${instanceId}, schema: ${schemaId}`);
};

// Legacy singleton structure changed to Map for proper instance isolation
const canvasAdapters = new Map<string, CanvasAdapter>();

export const getCanvasAdapter = function(instanceId: string): CanvasAdapter {
  if (!canvasAdapters.has(instanceId)) {
    canvasAdapters.set(instanceId, createCanvasAdapter(instanceId));
    console.log(`🏗️ Clean Architecture Canvas Adapter initialized for instance ${instanceId}`);
  }
  return canvasAdapters.get(instanceId)!;
};

export const destroyLegacyCanvasAdapter = function(instanceId: string): void {
  canvasAdapters.delete(instanceId);
};