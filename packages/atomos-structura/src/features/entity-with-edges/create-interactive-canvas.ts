// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { type CanvasAdapter, getCanvasAdapter } from '../../shared/core/adapters/canvas-adapter.js';
import { getGeneralSettings } from '../../shared/core/adapters/toolbox-config-manager.js';
import { autoRouteLinks } from '../../shared/core/application/dag-service.js';
import type { ApplicationEvent } from '../../shared/core/application/entity-service.js';
import { getInstanceReduxStore } from '../../shared/core/create-redux-store.js';
import type { DomainEntity } from '../../shared/core/domain/entity-aggregate.js';
import { getEntityManager } from '../../shared/core/presentation/entity-manager.js';
import type { EntitySpawnFactory } from '../../shared/core/types/entity-spawn-factory.types.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import { GROUP_NODE_TYPE, isHiddenByCollapse } from '../../shared/workflow-canvas/group-model.js';
import { restoreDomainLink, spawnCanvasEntity } from './spawn-canvas-entity.js';

interface Context {
  readonly workspace: WorkspaceManager;
  readonly adapter: CanvasAdapter;
  readonly instanceId: string;
}

/** Entities that explicitly belong to another schema are not drawn on the active one. */
const belongsToActiveSchema = (instanceId: string, entity: DomainEntity): boolean => {
  const state = getInstanceReduxStore(instanceId).get_state();
  const activeSchemaId = state.workspace.canvases[state.workspace.active_canvas_id]?.active_schema_id ?? '';
  const schemaId = (entity as DomainEntity & { readonly schemaId?: string }).schemaId;
  return !schemaId || !activeSchemaId || schemaId === activeSchemaId;
};

const spawnIfMissing = (ctx: Context, entity: DomainEntity): void => {
  if (ctx.workspace.workspaceState.value.entities.has(entity.id)) return;
  if (!belongsToActiveSchema(ctx.instanceId, entity)) return;
  // Children of collapsed groups stay unmounted; their group stands in for them.
  if (isHiddenByCollapse(ctx.adapter.getAllEntities(), entity.id)) return;
  const instance = spawnCanvasEntity(entity, ctx.workspace, ctx.adapter, ctx.instanceId);
  ctx.workspace.registerEntity(instance);
  // Containers render behind their children.
  if (entity.nodeType === GROUP_NODE_TYPE) instance.element.parentNode?.insertBefore(instance.element, instance.element.parentNode.firstChild);
};

const onEntityMoved = (ctx: Context, entityId: string, position: { x: number; y: number }): void => {
  ctx.workspace.workspaceState.value.entities.get(entityId)?.position.set({ ...position });
  const settings = getGeneralSettings();
  // Re-route only the links attached to the moved node (never the whole graph).
  if (!settings || settings.autoOptimizeConnections !== false) {
    autoRouteLinks(getEntityManager(ctx.instanceId), new Set([entityId]));
  }
};

const handleEvent = (ctx: Context, event: ApplicationEvent): void => {
  const entities = ctx.workspace.workspaceState.value.entities;
  switch (event.type) {
    case 'EntityCreated': spawnIfMissing(ctx, event.entity); break;
    case 'EntityNameUpdated': entities.get(event.entityId)?.element.setAttribute('aria-label', `${event.name} node`); break;
    case 'EntityMetadataUpdated': entities.get(event.entityId)?.updateMetadata?.(event.metadata); break;
    case 'EntityRemoved': ctx.workspace.unregisterEntity(event.entityId); break;
    case 'EntityMoved': onEntityMoved(ctx, event.entityId, event.position); break;
    case 'LinkCreated':
      if (!ctx.workspace.linkManager.getLink(event.link.id)) restoreDomainLink(ctx.workspace, ctx.adapter, event.link, false);
      break;
    case 'LinkEndpointsUpdated': restoreDomainLink(ctx.workspace, ctx.adapter, event.link, true); break;
    case 'LinkRemoved': ctx.workspace.removeLinkById(event.linkId, true); break;
    default: break;
  }
};

const installPersistenceHooks = (ctx: Context): void => {
  ctx.workspace.onLinkCreated = (link, isReconnect) => {
    if (isReconnect) ctx.adapter.updateLinkEndpoints(link.id, link.sourceAnchorId, link.targetAnchorId, link.leftEntityId, link.rightEntityId);
    else ctx.adapter.createLink(link.id, link.sourceAnchorId, link.targetAnchorId, link.leftEntityId, link.rightEntityId);
  };
  ctx.workspace.onEntityDeleted = entityId => ctx.adapter.removeEntity(entityId);
  ctx.workspace.onLinkDeleted = linkId => ctx.adapter.removeLink(linkId);
};

/**
 * Binds the domain event stream to the SVG workspace: spawns nodes (typed ports included),
 * draws persisted links, and persists user edits back through the canvas adapter.
 * Returns an unsubscribe function.
 */
export const createInteractiveEntityDemo = function(workspace: WorkspaceManager, instanceId: string): () => void {
  const ctx: Context = { workspace, adapter: getCanvasAdapter(instanceId), instanceId };
  const unsubscribe = ctx.adapter.onEntityChanged(event => handleEvent(ctx, event));
  installPersistenceHooks(ctx);

  // Toolbar / link-drop spawns: the store write announces EntityCreated, which registers the node.
  const factory: EntitySpawnFactory = (id, pos, ws) => {
    ctx.adapter.createEntity(id, 'New Entity', pos.x, pos.y);
    const registered = ws.workspaceState.value.entities.get(id);
    if (registered) return registered;
    const entity = ctx.adapter.getEntity(id);
    if (!entity) throw new Error(`Entity '${id}' could not be created`);
    return spawnCanvasEntity(entity, ws, ctx.adapter, instanceId);
  };
  workspace.setEntitySpawnFactory(factory);

  // Initial mount: draw persisted nodes, then persisted links between them.
  ctx.adapter.getAllEntities().forEach(entity => spawnIfMissing(ctx, entity));
  getEntityManager(instanceId).getAllLinks().forEach(link => {
    if (!workspace.linkManager.getLink(link.id)) restoreDomainLink(workspace, ctx.adapter, link, false);
  });
  return unsubscribe;
};
