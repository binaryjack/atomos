import { createSignal } from '../../core/create-signal.js';
import { createDemoEntity } from './create-demo-entity.js';
import { createAppStore } from '../../core/create-app-store.js';
import { createEntityStore } from '../../core/create-entity-store.js';
import { createSchemaStore } from '../../core/create-schema-store.js';
import { createLinkStore } from '../../core/create-link-store.js';
import { createReduxStorageProvider } from '../../core/storage/create-redux-storage-provider.js';
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js';
import type { EdgePosition } from '../edge/types/edge-position.types.js';
import type { EntityInstance } from '../../core/types/entity-instance.types.js';
import type { EntitySpawnFactory } from '../../core/types/entity-spawn-factory.types.js';
import type { Entity } from '@vbs/vbs-mod';
import { ENTITY_DEFAULT_WIDTH, ENTITY_DEFAULT_HEIGHT } from '../../core/entity-defaults.js';

interface DemoConfig {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

const makeEntityProps = (id: string, name: string, x: number, y: number): Entity => ({
  id,
  code: id,
  name,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  properties: [],
  position: { x, y },
  dimensions: { width: ENTITY_DEFAULT_WIDTH, height: ENTITY_DEFAULT_HEIGHT },
  edges: [],
});

const spawnEntity = (
  entityProps: Entity,
  workspace: WorkspaceManager,
  globalConfigSignal: ReturnType<typeof createAppStore>['globalStore']['signal'],
  schemaStore: ReturnType<typeof createSchemaStore>
): EntityInstance => {
  // Get entity signal from schema store (wired into persistence chain)
  const entityStore = schemaStore.getEntityStore(entityProps.id);
  if (!entityStore) throw new Error(`Entity ${entityProps.id} not in schema store`);
  
  const posSignal  = createSignal({ x: entityProps.position.x, y: entityProps.position.y });
  const dimsSignal = createSignal({ width: entityProps.dimensions.width, height: entityProps.dimensions.height });
  
  // Wire canvas position/size changes to schema store persistence
  posSignal.subscribe(pos => {
    console.log(`[CANVAS-PERSIST] Entity ${entityProps.id} position changed: (${pos.x}, ${pos.y})`);
    schemaStore.updateEntityCanvas(entityProps.id, { x: pos.x, y: pos.y });
  });
  dimsSignal.subscribe(dims => {
    console.log(`[CANVAS-PERSIST] Entity ${entityProps.id} dimensions changed: ${dims.width}x${dims.height}`);
    schemaStore.updateEntityCanvas(entityProps.id, { width: dims.width, height: dims.height });
  });
  
  const storageProvider = createReduxStorageProvider<Entity>({ 
    schemaStore: schemaStore 
  });
  const entity = createDemoEntity({
    id: entityProps.id,
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
  console.log('[CANVAS-LOAD] Starting interactive entity demo initialization...');
  
  const appStore    = createAppStore();
  const activeId    = appStore.appSignal.value.activeSchemaId ?? 'schema-default';
  const schemaStore = appStore.getSchemaStore(activeId);
  const globalConfig = appStore.globalStore.signal;

  console.log('[CANVAS-LOAD] Active schema ID:', activeId);
  console.log('[CANVAS-LOAD] Schema store:', schemaStore ? 'found' : 'NOT FOUND');
  
  if (schemaStore) {
    console.log('[CANVAS-LOAD] Current schema data:', schemaStore.signal.value);
    console.log('[CANVAS-LOAD] Entities in schema:', schemaStore.signal.value.entities);
    console.log('[CANVAS-LOAD] Links in schema:', schemaStore.signal.value.links);
    console.log('[CANVAS-LOAD] Canvas states:', schemaStore.signal.value.canvasStates);
    
    // Critical check: Are there saved links?
    const savedLinks = schemaStore.signal.value.links;
    if (savedLinks.length > 0) {
      console.log('[CANVAS-LOAD] *** FOUND SAVED LINKS - SHOULD RESTORE THEM ***');
      savedLinks.forEach(link => {
        console.log(`[CANVAS-LOAD] Link: ${link.id} (${link.leftEntityId} -> ${link.rightEntityId})`);
      });
    } else {
      console.log('[CANVAS-LOAD] *** NO SAVED LINKS ***');
    }
  }

  // Wire up link creation to schema store persistence
  (workspace as any).onLinkCreated = (link: any) => {
    console.log('[LINK-PERSIST] Link created:', link);
    console.log('[LINK-PERSIST] sourceAnchorId:', link.sourceAnchorId, 'targetAnchorId:', link.targetAnchorId);
    console.log('[LINK-PERSIST] leftEntityId:', link.leftEntityId, 'rightEntityId:', link.rightEntityId);
    console.log('[LINK-PERSIST] Adding to schema store...');
    schemaStore?.addLink({
      id: link.id,
      leftEntityId: link.leftEntityId,
      rightEntityId: link.rightEntityId,
      leftAnchorId: link.sourceAnchorId,
      rightAnchorId: link.targetAnchorId,
      leftCardinality: '1',
      rightCardinality: '1',
      renderType: 'linear',
    });
    console.log('[LINK-PERSIST] Link added to schema store');
  };

  // Wire up entity deletion to schema store persistence
  (workspace as any).onEntityDeleted = (entityId: string) => {
    console.log('[CANVAS-PERSIST] Entity deleted:', entityId);
    schemaStore?.removeEntity(entityId);
  };

  // Wire up individual link deletion to schema store persistence (not during cascade)
  (workspace as any).onLinkDeleted = (linkId: string) => {
    console.log('[CANVAS-PERSIST] Individual link deleted:', linkId);
    schemaStore?.removeLink(linkId);
  };

  // Register spawn factory so workspace can auto-create entities on link-drop
  const factory: EntitySpawnFactory = (id, pos, ws) => {
    const ep = makeEntityProps(id, 'New Entity', pos.x, pos.y);
    schemaStore?.addEntity(ep, { entityId: id, x: pos.x, y: pos.y, width: ep.dimensions.width, height: ep.dimensions.height });
    return spawnEntity(ep, ws, globalConfig, schemaStore!);
  };
  workspace.setEntitySpawnFactory(factory);

  // Bootstrap demo entities (use existing schema data or seed defaults)
  const existingEntities = schemaStore?.signal.value.entities ?? [];
  console.log('[CANVAS-LOAD] Found existing entities:', existingEntities.length);
  
  if (existingEntities.length > 0) {
    console.log('[CANVAS-LOAD] *** LOADING SAVED ENTITIES ***');
    existingEntities.forEach(e => {
      const cs = schemaStore!.signal.value.canvasStates.find(c => c.entityId === e.id);
      console.log(`[CANVAS-LOAD] Entity ${e.id}: name="${e.name}", canvas=(${cs?.x || 'NO X'},${cs?.y || 'NO Y'})`);
    });
  } else {
    console.log('[CANVAS-LOAD] *** NO SAVED ENTITIES - CREATING DEFAULTS ***');
  }

  const configs: DemoConfig[] = existingEntities.length > 0
    ? existingEntities.map(e => {
        const cs = schemaStore!.signal.value.canvasStates.find(c => c.entityId === e.id);
        console.log(`[CANVAS-LOAD] Entity ${e.id} - name: ${e.name}, canvas state:`, cs);
        return { id: e.id, name: e.name, x: cs?.x ?? 120, y: cs?.y ?? 180 };
      })
    : [
        { id: 'entity-a', name: 'Data Source', x: 120,  y: 180 },
        { id: 'entity-b', name: 'Processor',   x: 520,  y: 180 },
        { id: 'entity-c', name: 'Output',       x: 320,  y: 420 },
      ];

  console.log('[CANVAS-LOAD] Entity configs to create:', configs);

  configs.forEach(cfg => {
    // Ensure entity exists in schema store (idempotent via getOrCreate in registry)
    const existing = schemaStore?.signal.value.entities.find(e => e.id === cfg.id);
    const ep = existing ?? makeEntityProps(cfg.id, cfg.name, cfg.x, cfg.y);
    console.log(`[CANVAS-LOAD] Creating entity ${cfg.id} - existing: ${!!existing}, position: (${cfg.x}, ${cfg.y})`);
    
    if (!existing) {
      console.log(`[CANVAS-LOAD] Adding new entity ${cfg.id} to schema store`);
      schemaStore?.addEntity(ep, { entityId: cfg.id, x: cfg.x, y: cfg.y, width: ep.dimensions.width, height: ep.dimensions.height });
    }
    
    const instance = spawnEntity(ep, workspace, globalConfig, schemaStore!);
    console.log(`[CANVAS-LOAD] Spawned entity ${cfg.id} instance, registering with workspace`);
    workspace.registerEntity(instance);
  });

  // *** RESTORE VISUAL LINKS: Convert LinkProps back to visual links ***
  if (schemaStore) {
    const savedLinks = schemaStore.signal.value.links;
    console.log(`[CANVAS-LOAD] Found ${savedLinks.length} restored links in schema store`);
    
    if (savedLinks.length > 0) {
      // Wait for entities to be positioned, then recreate visual links
      setTimeout(() => {
        savedLinks.forEach(link => {
          console.log(`[CANVAS-LOAD] Recreating visual link: ${link.id} (${link.leftEntityId} -> ${link.rightEntityId})`);
          console.log(`[CANVAS-LOAD] Link anchor IDs: left=${link.leftAnchorId}, right=${link.rightAnchorId}`);
          
          // Validate anchor ID format and entity consistency
          const expectedLeftAnchorPrefix = `${link.leftEntityId}-anchor-`;
          const expectedRightAnchorPrefix = `${link.rightEntityId}-anchor-`;
          
          if (!link.leftAnchorId.startsWith(expectedLeftAnchorPrefix)) {
            console.warn(`[CANVAS-LOAD] ⚠️ Left anchor ID mismatch! Expected: ${expectedLeftAnchorPrefix}*, Got: ${link.leftAnchorId}`);
          }
          if (!link.rightAnchorId.startsWith(expectedRightAnchorPrefix)) {
            console.warn(`[CANVAS-LOAD] ⚠️ Right anchor ID mismatch! Expected: ${expectedRightAnchorPrefix}*, Got: ${link.rightAnchorId}`);
          }
          
          try {
            // Get entity positions for anchor calculation
            const leftEntity = workspace.workspaceState.value.entities.get(link.leftEntityId);
            const rightEntity = workspace.workspaceState.value.entities.get(link.rightEntityId);
            
            if (!leftEntity || !rightEntity) {
              console.warn(`[CANVAS-LOAD] Cannot restore link ${link.id}: missing entities`);
              return;
            }
            
            // Calculate anchor positions (simplified - using entity centers)
            const leftPos = leftEntity.position.value;
            const rightPos = rightEntity.position.value;
            const leftDims = leftEntity.dimensions.value;
            const rightDims = rightEntity.dimensions.value;
            
            // Determine anchor positions based on anchor IDs
            const getAnchorPos = (entityPos: any, entityDims: any, anchorId: string) => {
              const { x, y } = entityPos;
              const { width, height } = entityDims;
              if (anchorId.includes('-top')) return { x: x + width/2, y };
              if (anchorId.includes('-bottom')) return { x: x + width/2, y: y + height };
              if (anchorId.includes('-left')) return { x, y: y + height/2 };
              if (anchorId.includes('-right')) return { x: x + width, y: y + height/2 };
              return { x: x + width/2, y: y + height/2 }; // center fallback
            };
            
            const leftAnchorPos = getAnchorPos(leftPos, leftDims, link.leftAnchorId);
            const rightAnchorPos = getAnchorPos(rightPos, rightDims, link.rightAnchorId);
            
            // Determine edge positions
            const getEdgePosition = (anchorId: string): EdgePosition => {
              if (anchorId.includes('-top')) return 'top';
              if (anchorId.includes('-bottom')) return 'bottom';
              if (anchorId.includes('-left')) return 'left';
              if (anchorId.includes('-right')) return 'right';
              return 'bottom'; // fallback
            };
            
            const leftEdge = getEdgePosition(link.leftAnchorId);
            const rightEdge = getEdgePosition(link.rightAnchorId);
            
            // Use the proper workspace API to restore the link
            workspace.restoreLink(
              link.leftAnchorId,     // srcAnchorId
              leftAnchorPos,         // srcPos
              link.leftEntityId,     // srcEntityId
              leftEdge,             // srcEdge
              link.rightAnchorId,    // dstAnchorId
              rightAnchorPos,        // dstPos
              link.rightEntityId,    // dstEntityId
              rightEdge             // dstEdge
            );
            
            console.log(`[CANVAS-LOAD] ✓ Successfully recreated visual link ${link.id}`);
          } catch (err) {
            console.error(`[CANVAS-LOAD] ✗ Failed to recreate visual link ${link.id}:`, err);
          }
        });
      }, 200); // Delay to ensure entities are positioned
    }
  }
  
  // *** DEBUG: Check if onLinkCreated callback is set ***
  console.log('[LINK-DEBUG] workspace.onLinkCreated callback is:', typeof (workspace as any).onLinkCreated);
  if (!(workspace as any).onLinkCreated) {
    console.error('[LINK-DEBUG] ✗ onLinkCreated callback is NOT set! Links will not be persisted!');
  } else {
    console.log('[LINK-DEBUG] ✓ onLinkCreated callback is set');
  }
};
