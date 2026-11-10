// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import type { OverlayChange, OverlayController } from '../../shared/workflow-canvas/overlay-store.js';
import { applyEdgeOverlay, applyNodeOverlay, applyPresenceOverlay } from './apply-node-overlay.js';

/**
 * Renders the runtime overlay onto the editor canvas. Overlay state lives in the
 * OverlayController only: it is never written to the document or the undo history.
 */
export const createOverlayRenderer = (workspace: WorkspaceManager, overlay: OverlayController): (() => void) => {
  const sizeSubscriptions = new Map<string, () => void>();

  const renderNode = (nodeId: string): void => {
    const instance = workspace.workspaceState.value.entities.get(nodeId);
    if (!instance) return;
    applyNodeOverlay(instance.element, overlay.getNodeState(nodeId), instance.dimensions.value);
    applyPresenceOverlay(instance.element, overlay.peersOn(nodeId), instance.dimensions.value);
    if (!sizeSubscriptions.has(nodeId)) {
      sizeSubscriptions.set(nodeId, instance.dimensions.subscribe(() => renderNode(nodeId)));
    }
  };

  const renderEdge = (edgeId: string): void => {
    const link = workspace.linkManager.getLink(edgeId);
    if (link) applyEdgeOverlay(link.element, overlay.getEdgeState(edgeId)?.active ?? false);
  };

  const renderAll = (): void => {
    workspace.workspaceState.value.entities.forEach((_, id) => renderNode(id));
    workspace.linkManager.links.value.forEach((_, id) => renderEdge(id));
  };

  const onChange = (change: OverlayChange): void => {
    if (change.kind === 'node') renderNode(change.id);
    else if (change.kind === 'edge') renderEdge(change.id);
    else renderAll(); // 'clear' and 'presence' can affect any node
  };

  const unsubscribeOverlay = overlay.subscribe(onChange);
  // Nodes / links (re)created by undo, import or reconcile pick up their current overlay state.
  const unsubscribeEntities = workspace.workspaceState.subscribe(state => {
    sizeSubscriptions.forEach((unsubscribe, id) => {
      if (state.entities.has(id)) return;
      unsubscribe();
      sizeSubscriptions.delete(id);
    });
    state.entities.forEach((_, id) => { if (overlay.getNodeState(id) || overlay.peersOn(id).length > 0) renderNode(id); });
  });
  const unsubscribeLinks = workspace.linkManager.links.subscribe(links => {
    links.forEach((_, id) => { if (overlay.getEdgeState(id)) renderEdge(id); });
  });

  return () => {
    unsubscribeOverlay();
    unsubscribeEntities();
    unsubscribeLinks();
    sizeSubscriptions.forEach(unsubscribe => unsubscribe());
    sizeSubscriptions.clear();
  };
};
