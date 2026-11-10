// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CanvasViewport } from '../../shared/core/create-canvas-viewport.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import { createDomCuller } from './create-dom-culler.js';

export interface ViewportCullingHandle {
  /** Re-mounts every culled element (call before DOM snapshots / exports). */
  readonly restoreAll: () => void;
  readonly destroy: () => void;
}

const nextFrame = (run: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else setTimeout(run, 16);
};

/** Keeps the canvas DOM bounded: culls on pan / zoom and when nodes or links are added or removed. */
export const mountViewportCulling = (
  workspace: WorkspaceManager, viewport: CanvasViewport, contentRoot: Element, container: HTMLElement
): ViewportCullingHandle => {
  const culler = createDomCuller({
    contentRoot,
    nodes: () => workspace.workspaceState.value.entities,
    viewport: () => viewport.state.value,
    viewportSize: () => {
      const rect = container.getBoundingClientRect();
      return { width: rect.width || 1280, height: rect.height || 800 };
    },
  });
  let scheduled = false;
  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    nextFrame(() => { scheduled = false; culler.update(); });
  };
  // Cursor tracking also updates workspace state: only react when the node set itself changes.
  let lastEntities = workspace.workspaceState.value.entities;
  const unsubscribers = [
    viewport.state.subscribe(schedule),
    workspace.linkManager.links.subscribe(schedule),
    workspace.workspaceState.subscribe(state => {
      if (state.entities === lastEntities) return;
      lastEntities = state.entities;
      schedule();
    }),
  ];
  schedule();
  return {
    restoreAll: culler.restoreAll,
    destroy: () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      culler.restoreAll();
    },
  };
};
