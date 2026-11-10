// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import type { SelectionModel } from '../../shared/workflow-canvas/selection-model.js';

const SELECTED_FILTER = 'drop-shadow(0 0 6px #3b82f6)';

/**
 * Mirrors the multi-selection model onto node elements (glow + aria-selected), including
 * nodes spawned after the selection changed. Returns a cleanup function.
 */
export const createSelectionVisuals = (workspace: WorkspaceManager, selection: SelectionModel): (() => void) => {
  const apply = (): void => {
    workspace.workspaceState.value.entities.forEach((instance, id) => {
      const isSelected = selection.has(id);
      instance.element.style.filter = isSelected ? SELECTED_FILTER : '';
      instance.element.setAttribute('aria-selected', String(isSelected));
    });
  };
  const unsubscribeSelection = selection.subscribe(apply);
  const unsubscribeWorkspace = workspace.workspaceState.subscribe(state => {
    // Drop ids of nodes that left the canvas so selection never references ghosts.
    const gone = selection.get().filter(id => !state.entities.has(id));
    if (gone.length > 0) selection.remove(gone);
    else apply();
  });
  apply();
  return () => {
    unsubscribeSelection();
    unsubscribeWorkspace();
  };
};
