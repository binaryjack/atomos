import { createSignal } from '../../core/create-signal.js';
import { createDemoEntity } from './create-demo-entity.js';
import { createAppStore } from '../../core/create-app-store.js';
import { createEntityStore } from '../../core/create-entity-store.js';
import { createSchemaStore } from '../../core/create-schema-store.js';
import { createLocalStorageProvider } from '../../core/storage/create-local-storage-provider.js';
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js';
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
    schemaStore.updateEntityCanvas(entityProps.id, { x: pos.x, y: pos.y });
  });
  dimsSignal.subscribe(dims => {
    schemaStore.updateEntityCanvas(entityProps.id, { width: dims.width, height: dims.height });
  });
  
  const storageProvider = createLocalStorageProvider<Entity>({ prefix: 'vbe2' });
  const entity = createDemoEntity({
    id: entityProps.id,
    entitySignal: entityStore.signal,
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
  const appStore    = createAppStore();
  const activeId    = appStore.appSignal.value.activeSchemaId ?? 'schema-default';
  const schemaStore = appStore.getSchemaStore(activeId);
  const globalConfig = appStore.globalStore.signal;

  // Register spawn factory so workspace can auto-create entities on link-drop
  const factory: EntitySpawnFactory = (id, pos, ws) => {
    const ep = makeEntityProps(id, 'New Entity', pos.x, pos.y);
    schemaStore?.addEntity(ep, { entityId: id, x: pos.x, y: pos.y, width: ep.dimensions.width, height: ep.dimensions.height });
    return spawnEntity(ep, ws, globalConfig, schemaStore!);
  };
  workspace.setEntitySpawnFactory(factory);

  // Bootstrap demo entities (use existing schema data or seed defaults)
  const existingEntities = schemaStore?.signal.value.entities ?? [];

  const configs: DemoConfig[] = existingEntities.length > 0
    ? existingEntities.map(e => {
        const cs = schemaStore!.signal.value.canvasStates.find(c => c.entityId === e.id);
        return { id: e.id, name: e.name, x: cs?.x ?? 120, y: cs?.y ?? 180 };
      })
    : [
        { id: 'entity-a', name: 'Data Source', x: 120,  y: 180 },
        { id: 'entity-b', name: 'Processor',   x: 520,  y: 180 },
        { id: 'entity-c', name: 'Output',       x: 320,  y: 420 },
      ];

  configs.forEach(cfg => {
    // Ensure entity exists in schema store (idempotent via getOrCreate in registry)
    const existing = schemaStore?.signal.value.entities.find(e => e.id === cfg.id);
    const ep = existing ?? makeEntityProps(cfg.id, cfg.name, cfg.x, cfg.y);
    if (!existing) {
      schemaStore?.addEntity(ep, { entityId: cfg.id, x: cfg.x, y: cfg.y, width: ep.dimensions.width, height: ep.dimensions.height });
    }
    const instance = spawnEntity(ep, workspace, globalConfig, schemaStore!);
    workspace.registerEntity(instance);
  });
};
