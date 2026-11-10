// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CanvasViewport } from '../../shared/core/create-canvas-viewport.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import type { ReduxStore } from '../../shared/types/redux-state.types.js';

const PADDING = 100;
const MAX_ZOOM = 1.5;

interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

const contentBounds = (workspace: WorkspaceManager): Bounds | null => {
  const entities = workspace.workspaceState.value.entities;
  if (entities.size === 0) return null;
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  entities.forEach(entity => {
    const { x, y } = entity.position.value;
    const { width, height } = entity.dimensions.value;
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x + width);
    bounds.maxY = Math.max(bounds.maxY, y + height);
  });
  return bounds;
};

/** Zooms and pans so every node fits the canvas (never zooming past 150%). */
export const fitWorkspaceToScreen = (
  workspace: WorkspaceManager, viewport: CanvasViewport, container: HTMLElement, store: ReduxStore
): void => {
  const bounds = contentBounds(workspace);
  if (!bounds) {
    viewport.reset();
    return;
  }
  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const contentW = bounds.maxX - bounds.minX + PADDING * 2;
  const contentH = bounds.maxY - bounds.minY + PADDING * 2;
  const zoom = Math.min(rect.width / contentW, rect.height / contentH, MAX_ZOOM);
  const centerX = bounds.minX - PADDING + contentW / 2;
  const centerY = bounds.minY - PADDING + contentH / 2;
  const next = { zoom, pan: { x: rect.width / 2 - centerX * zoom, y: rect.height / 2 - centerY * zoom } };
  viewport.setExternalState(next);
  store.dispatch({ type: 'viewport-updated', viewport: next });
};
