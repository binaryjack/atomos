// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { getEntityManager } from '../../shared/core/presentation/entity-manager.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import { getActiveSchema } from '../../shared/workflow-canvas/connection-graph.js';
import { isHiddenByCollapse, visibleEndpoint } from '../../shared/workflow-canvas/group-model.js';

/** Brings the SVG workspace in line with the store (undo/redo, document import, remote edits). */
export interface WorkspaceReconciler {
  readonly reconcile: () => void;
}

/** Structural identity of a node: when it changes the node DOM is rebuilt (ports, body, label). */
const fingerprint = (entity: Entity): string => {
  const stored = entity as Entity & { readonly color?: string };
  return JSON.stringify([entity.name, entity.shape, stored.color, entity.nodeType, entity.ports ?? [], entity.config ?? {}, entity.collapsed ?? false]);
};

const syncGeometry = (workspace: WorkspaceManager, entity: Entity): void => {
  const instance = workspace.workspaceState.value.entities.get(entity.id);
  if (!instance) return;
  const x = Number(entity.position?.x) || 0;
  const y = Number(entity.position?.y) || 0;
  const current = instance.position.value;
  if (Math.abs(current.x - x) > 0.5 || Math.abs(current.y - y) > 0.5) instance.position.set({ x, y });
  const width = Number(entity.dimensions?.width) || 200;
  const height = Number(entity.dimensions?.height) || 100;
  const size = instance.dimensions.value;
  if (Math.abs(size.width - width) > 0.5 || Math.abs(size.height - height) > 0.5) instance.dimensions.set({ width, height });
};

const reconcileLinks = (
  workspace: WorkspaceManager, instanceId: string, links: readonly LinkProps[], entities: readonly Entity[]
): void => {
  const target = new Map(links.map(link => [link.id, link]));
  const drawn = workspace.linkManager.links.value;
  Array.from(drawn.keys()).forEach(linkId => {
    const stored = target.get(linkId);
    const shown = drawn.get(linkId);
    // Compare against the visible endpoints (collapsed groups substitute boundary proxy ports).
    const src = stored && visibleEndpoint(entities, stored.leftEntityId, stored.leftAnchorId, 'out');
    const dst = stored && visibleEndpoint(entities, stored.rightEntityId, stored.rightAnchorId, 'in');
    const moved = src && dst && shown && (shown.sourceAnchorId !== src.anchorId || shown.targetAnchorId !== dst.anchorId);
    if (!stored || moved) workspace.removeLinkById(linkId, true);
  });
  const manager = getEntityManager(instanceId);
  target.forEach((_, linkId) => { if (!workspace.linkManager.getLink(linkId)) manager.reannounceLink(linkId); });
};

export const createWorkspaceReconciler = (
  workspace: WorkspaceManager, store: ReduxStore, instanceId: string
): WorkspaceReconciler => {
  const known = new Map<string, string>();
  getActiveSchema(store.get_state())?.entities.forEach(entity => known.set(entity.id, fingerprint(entity)));

  const reconcile = (): void => {
    const schema = getActiveSchema(store.get_state());
    if (!schema) return;
    // Children of collapsed groups are not mounted: they count as absent for the DOM.
    const target = new Map(schema.entities.filter(e => !isHiddenByCollapse(schema.entities, e.id)).map(entity => [entity.id, entity]));
    Array.from(workspace.workspaceState.value.entities.keys()).forEach(id => {
      const entity = target.get(id);
      const changed = entity !== undefined && known.has(id) && known.get(id) !== fingerprint(entity);
      // DOM-only removal: the store is already the source of truth here.
      if (!entity || changed) workspace.unregisterEntity(id, { silent: true });
    });
    const manager = getEntityManager(instanceId);
    target.forEach((entity, id) => {
      known.set(id, fingerprint(entity));
      if (workspace.workspaceState.value.entities.has(id)) syncGeometry(workspace, entity);
      else manager.reannounceEntity(id);
    });
    Array.from(known.keys()).forEach(id => { if (!target.has(id)) known.delete(id); });
    reconcileLinks(workspace, instanceId, schema.links, schema.entities);
  };

  return { reconcile };
};
