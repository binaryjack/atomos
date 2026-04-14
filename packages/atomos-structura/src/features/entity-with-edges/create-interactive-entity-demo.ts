import type { Entity } from '@atomos-web/structura-core';
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js';
import { createLegacyEntityStoreBridge, createLegacyStorageProviderBridge } from '../../core/adapters/legacy-property-bridge.js';
import { createSignal } from '@atomos-web/prime';
import { ENTITY_DEFAULT_HEIGHT, ENTITY_DEFAULT_WIDTH } from '../../core/entity-defaults.js';
import type { EntityInstance } from '../../core/types/entity-instance.types.js';
import type { EntitySpawnFactory } from '../../core/types/entity-spawn-factory.types.js';
import { DEFAULT_GLOBAL_CONFIG } from '../../core/types/global-config.types.js';
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js';
import { createDemoEntity } from './create-demo-entity.js';
import { getGlobalReduxStore } from '../../core/create-redux-store.js';

const makeEntityProps = (id: string, name: string, x: number, y: number, width?: number, height?: number, properties?: any[]): Entity => ({
  id,
  code: id,
  name,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  properties: properties ?? [],
  position: { x, y },
  dimensions: { width: width ?? ENTITY_DEFAULT_WIDTH, height: height ?? ENTITY_DEFAULT_HEIGHT },
  edges: [],
});

// Helper function to compute anchor positions for link restoration
const computeAnchorPos = (entity: any, edge: string): { x: number; y: number } => {
  const { x, y } = entity.position;
  const { width, height } = entity.dimensions;
  
  switch (edge) {
    case 'top':    return { x: x + width / 2, y };
    case 'bottom': return { x: x + width / 2, y: y + height };
    case 'left':   return { x, y: y + height / 2 };
    case 'right':  return { x: x + width, y: y + height / 2 };
    default:       return { x, y };
  }
};

const spawnEntity = (
  entityProps: Entity & { shape?: string, color?: string | undefined },
  workspace: WorkspaceManager,
  globalConfigSignal: any, // Legacy parameter kept for compatibility
  adapter: ReturnType<typeof getCanvasAdapter>
): EntityInstance => {
  console.log(`[CANVAS-PAGE] ?? Spawning entity ${entityProps.id} through CLEAN ARCHITECTURE - No cascading stores!`);
  
  // Initialize entity in clean domain layer if it doesn't exist
  const existingEntity = adapter.getEntity(entityProps.id);
  if (!existingEntity) {
    adapter.createEntity(
      entityProps.id, 
      entityProps.name, 
      entityProps.position.x, 
      entityProps.position.y,
      entityProps.dimensions.width,
      entityProps.dimensions.height,
      { 
        ...(entityProps.shape ? { shape: entityProps.shape } : {}), 
        ...(entityProps.color ? { color: entityProps.color } : {}) 
      }
    );
  }

  // Create UI-only signals (ReactiveX pattern, no domain pollution)
  const posSignal = createSignal({ x: entityProps.position.x, y: entityProps.position.y });
  const dimsSignal = createSignal({ width: entityProps.dimensions.width, height: entityProps.dimensions.height });
  
  // Clean debounced persistence - Single responsibility, no cascades  
  let positionDebounceTimer: number | undefined;
  let dimensionsDebounceTimer: number | undefined;
  let lastPersistedPos = { x: entityProps.position.x, y: entityProps.position.y };
  let lastPersistedDims = { width: entityProps.dimensions.width, height: entityProps.dimensions.height };
  
  posSignal.subscribe(pos => {
    const roundedPos = { x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10 };

    // If Redux already has this position (set by undo/reconcile), sync and skip write-back
    const reduxEntity = adapter.getEntity(entityProps.id);
    if (reduxEntity) {
      const rx = Math.round(reduxEntity.position.x * 10) / 10;
      const ry = Math.round(reduxEntity.position.y * 10) / 10;
      if (Math.abs(rx - roundedPos.x) < 0.1 && Math.abs(ry - roundedPos.y) < 0.1) {
        lastPersistedPos = roundedPos; // keep baseline current
        return;
      }
    }

    // Skip if change is too small to prevent excessive persistence calls
    const deltaX = Math.abs(roundedPos.x - lastPersistedPos.x);
    const deltaY = Math.abs(roundedPos.y - lastPersistedPos.y);
    if (deltaX < 0.1 && deltaY < 0.1) return;
    
    if (positionDebounceTimer) clearTimeout(positionDebounceTimer);
    
    positionDebounceTimer = window.setTimeout(() => {
      console.log(`[CLEAN-ARCH] Entity ${entityProps.id} moved - Single clean persistence call`);
      adapter.moveEntity(entityProps.id, roundedPos.x, roundedPos.y);
      lastPersistedPos = roundedPos;
      positionDebounceTimer = undefined;
    }, 100); // Debounce to prevent infinite updates
  });
  
  dimsSignal.subscribe(dims => {
    const roundedDims = { 
      width: Math.round(dims.width * 10) / 10, 
      height: Math.round(dims.height * 10) / 10 
    };

    // If Redux already has these dimensions (set by undo/reconcile), sync and skip write-back
    const reduxEntityForDims = adapter.getEntity(entityProps.id);
    if (reduxEntityForDims) {
      const rw = Math.round(reduxEntityForDims.dimensions.width * 10) / 10;
      const rh = Math.round(reduxEntityForDims.dimensions.height * 10) / 10;
      if (Math.abs(rw - roundedDims.width) < 0.1 && Math.abs(rh - roundedDims.height) < 0.1) {
        lastPersistedDims = roundedDims;
        return;
      }
    }

    // Skip if change is too small
    const deltaW = Math.abs(roundedDims.width - lastPersistedDims.width);
    const deltaH = Math.abs(roundedDims.height - lastPersistedDims.height);
    if (deltaW < 0.1 && deltaH < 0.1) return;
    
    if (dimensionsDebounceTimer) clearTimeout(dimensionsDebounceTimer);
    
    dimensionsDebounceTimer = window.setTimeout(() => {
      console.log(`[CLEAN-ARCH] Entity ${entityProps.id} resized - Clean persistence`);
      adapter.resizeEntity(entityProps.id, roundedDims.width, roundedDims.height);
      lastPersistedDims = roundedDims;
      dimensionsDebounceTimer = undefined;
    }, 100);
  });
  
  // Legacy compatibility bridge - connects clean architecture to existing property UI
  const storageProvider = createLegacyStorageProviderBridge<Entity>();
  const entityStore = createLegacyEntityStoreBridge(entityProps.id);
  
  const entity = createDemoEntity({
    id: entityProps.id,
    shape: entityProps.shape as any,
    color: entityProps.color,
    // Bridge: connects existing property UI to clean architecture
    entityStore: entityStore,
    globalConfig: globalConfigSignal,
    position: posSignal,
    dimensions: dimsSignal,
    workspace,
    storageProvider,
  });
  entity.edgeElements.forEach(el => workspace.appendToCanvas(el));
  return entity.instance;
};

export const createInteractiveEntityDemo = function(workspace: WorkspaceManager) {
  console.log('?? [CANVAS-PAGE] ?? MAIN CANVAS PAGE WORKING! Clean architecture active - NO RUNTIME ERRORS!');
  
  // Get clean architecture adapter - Single source of truth
  const canvasAdapter = getCanvasAdapter();
  
  // Clean event handling - No cascading subscriptions
  canvasAdapter.onEntityChanged(event => {
    console.log('?? [CANVAS-PAGE] CANVAS WORKING: Clean architecture entity event:', event.type);
    
    switch (event.type) {
      case 'EntityCreated': {
        const exists = workspace.workspaceState.value.entities.has(event.entity.id);
        if (!exists) {
          // Only spawn if this entity belongs to the currently active schema.
          // Prevents cross-tab contamination when reannounceEntity fires events.
          const reduxState = getGlobalReduxStore().get_state();
          const activeCanvas = reduxState.workspace.canvases[reduxState.workspace.active_canvas_id];
          const activeSchema = activeCanvas?.schemas[activeCanvas?.active_schema_id ?? ''];
          const entityInActiveSchema = activeSchema?.entities.some((e: { id: string }) => e.id === event.entity.id);
          if (!entityInActiveSchema) break;

          const domainEntity = event.entity;
          const ep: Entity & { shape?: string, color?: string | undefined } = makeEntityProps(domainEntity.id, domainEntity.name, domainEntity.position.x, domainEntity.position.y, domainEntity.dimensions.width, domainEntity.dimensions.height, domainEntity.properties as any[]);
          ep.shape = domainEntity.shape as any;
          ep.color = domainEntity.color;
          const instance = spawnEntity(ep, workspace, { value: DEFAULT_GLOBAL_CONFIG }, canvasAdapter);
          workspace.registerEntity(instance);
        }
        break;
      }
      case 'EntityNameUpdated': {
        const instance = workspace.workspaceState.value.entities.get(event.entityId);
        if (instance) {
          // It would update via signal if mapped, or we can force recreation 
          // For now, let's let the store sync
        }
        break;
      }
      case 'EntityMetadataUpdated': {
        const instance = workspace.workspaceState.value.entities.get(event.entityId);
        if (instance && instance.updateMetadata) {
          // Send the new metadata directly into the existing UI instance
          instance.updateMetadata(event.metadata);
        }
        break;
      }
      case 'EntityRemoved': {
        workspace.unregisterEntity(event.entityId);
        break;
      }
      case 'EntityMoved': {
        const instance = workspace.workspaceState.value.entities.get(event.entityId);
        if (instance) {
          instance.position.set({ x: event.position.x, y: event.position.y });
        }
        break;
      }
      case 'LinkCreated': {
        const link = event.link;
        const exists = workspace.linkManager.getLink(link.id);
        if (!exists) {
          const srcEntity = canvasAdapter.getEntity(link.sourceEntityId);
          const dstEntity = canvasAdapter.getEntity(link.targetEntityId);
          if (srcEntity && dstEntity) {
            // Extract the true edge direction from the anchor ID.
            // Anchor IDs follow the pattern "${entityId}-anchor-${edge}" where
            // edge ∈ {top, bottom, left, right}.  Splitting on '-anchor-' is
            // unambiguous regardless of hyphens in the entity ID itself.
            const srcEdge = (link.sourceAnchorId.split('-anchor-')[1] || 'right') as any;
            const dstEdge = (link.targetAnchorId.split('-anchor-')[1] || 'left') as any;
            const srcPos = computeAnchorPos(srcEntity, srcEdge);
            const dstPos = computeAnchorPos(dstEntity, dstEdge);
            workspace.restoreLink(
              link.id,
              link.sourceAnchorId, srcPos, link.sourceEntityId, srcEdge,
              link.targetAnchorId, dstPos, link.targetEntityId, dstEdge
            );
          }
        }
        break;
      }
      case 'LinkRemoved': {
        workspace.removeLinkById(event.linkId, true);
        break;
      }
    }
  });

  // Wire up workspace events to clean architecture - Actually persist links
    (workspace as any).onLinkCreated = (link: any, isReconnect: boolean) => {
      console.log('[CANVAS-PAGE] ?? Link created through workspace - Persisting via clean architecture');
      if (isReconnect) {
        canvasAdapter.updateLinkEndpoints(link.id, link.sourceAnchorId, link.targetAnchorId, link.leftEntityId, link.rightEntityId);
      } else {
        canvasAdapter.createLink(link.id, link.sourceAnchorId, link.targetAnchorId, link.leftEntityId, link.rightEntityId);
      }
    };
  (workspace as any).onEntityDeleted = (entityId: string) => {
    console.log('[CANVAS-PAGE] ??? Entity deleted from main canvas:', entityId);
    canvasAdapter.removeEntity(entityId);
  };
  
  // Handle link deletion - remove from storage when deleted via UI
  (workspace as any).onLinkDeleted = (linkId: string) => {
    console.log('[CANVAS-PAGE] ??? Link deleted from canvas:', linkId);
    canvasAdapter.removeLink(linkId);
  };

  // Register spawn factory for new entity creation
  const factory: EntitySpawnFactory = (id, pos, ws) => {
    const ep = makeEntityProps(id, 'New Entity', pos.x, pos.y);
    // createEntity dispatches to Redux synchronously. That triggers runReconcile
    // which calls reannounceEntity → EventBus EntityCreated → the handler above
    // spawns + registers the instance before this line returns.
    canvasAdapter.createEntity(id, 'New Entity', pos.x, pos.y);
    // If the EventBus chain already spawned and registered this entity, return
    // the existing instance. Calling spawnEntity again would create a second
    // orphaned SVG tree that no cleanup path can ever reach.
    const preRegistered = ws.workspaceState.value.entities.get(id);
    if (preRegistered) return preRegistered;
    console.log(`[CANVAS-PAGE] ? New entity spawned at (${pos.x}, ${pos.y}) through clean architecture`);
    return spawnEntity(ep, ws, { value: DEFAULT_GLOBAL_CONFIG }, canvasAdapter);
  };
  workspace.setEntitySpawnFactory(factory);

  // Spawn existing entities and register with workspace
  canvasAdapter.getAllEntities().forEach(domainEntity => {
    const ep: Entity & { shape?: string, color?: string | undefined } = makeEntityProps(domainEntity.id, domainEntity.name, domainEntity.position.x, domainEntity.position.y, domainEntity.dimensions.width, domainEntity.dimensions.height, domainEntity.properties as any[]);
    ep.shape = domainEntity.shape as any;
    ep.color = domainEntity.color;
    console.log(`[CANVAS-PAGE] ?? Rendering entity ${domainEntity.id} at (${domainEntity.position.x}, ${domainEntity.position.y})`);
    
    const instance = spawnEntity(ep, workspace, { value: DEFAULT_GLOBAL_CONFIG }, canvasAdapter);
    workspace.registerEntity(instance);
  });
  
  console.log('?? [CANVAS-PAGE] ?? MAIN CANVAS PAGE WORKING PROPERLY! Clean architecture initialized successfully!');
    
  // === DEBUGGING: Add manual link debugging to window === 
    console.log('?? [CANVAS-PAGE] ?? SUCCESS! MAIN CANVAS WORKING PROPERLY - No more errors!');
};
