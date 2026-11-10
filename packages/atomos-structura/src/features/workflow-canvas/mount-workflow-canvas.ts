// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CanvasViewport } from '../../shared/core/create-canvas-viewport.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import { destroyCanvasRuntime, getCanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';
import { bindCanvasKeyboard } from '../canvas-keyboard/bind-canvas-keyboard.js';
import { createWorkspaceReconciler } from '../canvas-reconcile/create-workspace-reconciler.js';
import { createSelectionVisuals } from '../canvas-selection/create-selection-visuals.js';
import type { McpSyncOptions } from '../mcp-sync/create-mcp-sync.js';
import { createOverlayRenderer } from '../node-overlay/create-overlay-renderer.js';
import { createSnapshotSource } from '../viewport-culling/create-snapshot-source.js';
import { mountViewportCulling } from '../viewport-culling/mount-viewport-culling.js';
import { createPortHighlighter } from '../workflow-ports/create-port-highlighter.js';
import { createStoreEventBridge } from './create-store-event-bridge.js';
import { createWorkflowCanvasApi } from './create-workflow-canvas-api.js';
import type { WorkflowCanvasApi } from './workflow-canvas-api.types.js';

export { fitWorkspaceToScreen } from '../canvas-viewport/fit-workspace-to-screen.js';

export interface MountWorkflowCanvasDeps {
  readonly instanceId: string;
  /** Shadow host of the canvas: focus target and keyboard scope. */
  readonly host: HTMLElement;
  readonly store: ReduxStore;
  readonly workspace: WorkspaceManager;
  readonly viewport: CanvasViewport;
  readonly showShortcuts?: () => void;
  /** World container + its sizing element: enables viewport culling when both are given. */
  readonly contentRoot?: Element;
  readonly container?: HTMLElement;
}

export interface MountedWorkflowCanvas {
  readonly api: WorkflowCanvasApi;
  /** Store -> DOM sync (undo/redo, import, remote MCP changes). */
  readonly reconcile: () => void;
  /** Wraps an SVG getter so exports re-mount culled nodes first. */
  readonly snapshotSource: (getSvg: () => SVGSVGElement) => () => SVGSVGElement;
  /** MCP options routing node progress to the overlay and remote edits to the reconciler. */
  readonly mcpOptions: McpSyncOptions;
  readonly destroy: () => void;
}

const describeHost = (host: HTMLElement): void => {
  host.setAttribute('role', 'application');
  if (!host.hasAttribute('aria-label')) host.setAttribute('aria-label', 'Workflow canvas');
  host.setAttribute('aria-roledescription', 'diagram editor');
  host.style.outline = 'none';
};

const cancelInteraction = (workspace: WorkspaceManager, deps: MountWorkflowCanvasDeps): void => {
  workspace.behaviorManager.cancelLinkCreation();
  getCanvasRuntime(deps.instanceId).selection.clear();
};

/** Wires the workflow-designer layers of one canvas instance and returns its public API. */
export const mountWorkflowCanvas = (deps: MountWorkflowCanvasDeps): MountedWorkflowCanvas => {
  const { instanceId, store, workspace } = deps;
  const runtime = getCanvasRuntime(instanceId);
  const reconciler = createWorkspaceReconciler(workspace, store, instanceId);
  const api = createWorkflowCanvasApi({
    instanceId, store, reconcile: reconciler.reconcile,
    applyViewport: vp => deps.viewport.setExternalState({ zoom: vp.zoom, pan: { x: vp.x, y: vp.y } }),
  });
  describeHost(deps.host);
  const cleanups: Array<() => void> = [
    createStoreEventBridge(store, runtime.events),
    createOverlayRenderer(workspace, runtime.overlay),
    createPortHighlighter(workspace, instanceId),
    createSelectionVisuals(workspace, runtime.selection),
    bindCanvasKeyboard(deps.host, {
      undo: api.undo, redo: api.redo, deleteSelection: api.deleteSelection, copy: () => { api.copySelection(); },
      paste: () => { api.paste(); }, selectAll: api.selectAll, escape: () => cancelInteraction(workspace, deps),
      ...(deps.showShortcuts ? { showShortcuts: deps.showShortcuts } : {}),
    }),
    store.onUndoRedo?.(() => reconciler.reconcile()) ?? (() => undefined),
  ];
  const culling = deps.contentRoot && deps.container
    ? mountViewportCulling(workspace, deps.viewport, deps.contentRoot, deps.container)
    : undefined;
  if (culling) cleanups.push(culling.destroy);
  return {
    api,
    reconcile: reconciler.reconcile,
    snapshotSource: getSvg => createSnapshotSource(getSvg, () => culling?.restoreAll()),
    mcpOptions: { instanceId, onNodeProgress: (id, state) => runtime.overlay.setNodeState(id, state), onRemoteChange: reconciler.reconcile },
    destroy: () => {
      cleanups.forEach(fn => fn());
      destroyCanvasRuntime(instanceId);
    },
  };
};
