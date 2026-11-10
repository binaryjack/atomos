// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { getInstanceReduxStore } from '../../shared/core/create-redux-store.js';
import { getEntityManager } from '../../shared/core/presentation/entity-manager.js';
import type { Signal } from '../../shared/core/types/signal.types.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import { getCanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';
import { getActiveSchema } from '../../shared/workflow-canvas/connection-graph.js';
import { descendantsOf } from '../../shared/workflow-canvas/group-model.js';

interface Member {
  readonly id: string;
  readonly start: { readonly x: number; readonly y: number };
  /** Live signal of mounted nodes; absent for children hidden in a collapsed group. */
  readonly position?: Signal<{ x: number; y: number }>;
}

/** Selected nodes plus every descendant of moved groups (mounted or hidden). */
const collectCompanions = (
  workspace: WorkspaceManager, store: ReduxStore, primaryId: string, selected: readonly string[]
): Member[] => {
  const stored = getActiveSchema(store.get_state())?.entities ?? [];
  const moving = new Set([primaryId, ...selected]);
  Array.from(moving).forEach(id => descendantsOf(stored, id).forEach(child => moving.add(child)));
  moving.delete(primaryId);
  const mounted = workspace.workspaceState.value.entities;
  return Array.from(moving).flatMap(id => {
    const instance = mounted.get(id);
    if (instance) return [{ id, start: { ...instance.position.value }, position: instance.position }];
    const entity = stored.find(e => e.id === id);
    return entity ? [{ id, start: { ...entity.position } }] : [];
  });
};

/** The nodes that move together in one drag gesture (the primary plus the rest of the selection). */
export interface DragGroup {
  /** Starts the gesture transaction: every move persisted until `commit` is ONE undo step. */
  readonly begin: () => void;
  /** Moves the companions of the primary node by the same delta (live, UI only). */
  readonly moveCompanions: (dx: number, dy: number) => void;
  /** Persists final positions of every member, then closes the gesture transaction. */
  readonly commit: (primary: { x: number; y: number }, dx: number, dy: number) => void;
  /** Closes the gesture transaction without persisting (click without movement). */
  readonly cancel: () => void;
}

/**
 * Applies the click-selection rules and returns the drag group:
 * shift toggles membership; clicking an unselected node selects only that node.
 */
export const createDragGroup = (workspace: WorkspaceManager, primaryId: string, additive: boolean): DragGroup => {
  const selection = getCanvasRuntime(workspace.instanceId).selection;
  if (additive) selection.toggle(primaryId);
  else if (!selection.has(primaryId)) selection.set([primaryId]);
  const store = getInstanceReduxStore(workspace.instanceId);
  const companions = collectCompanions(workspace, store, primaryId, selection.get());
  let open = false;

  return {
    begin: () => {
      if (open) return;
      open = true;
      store.beginTransaction(companions.length > 0 ? 'Move nodes' : 'Move node');
    },
    moveCompanions: (dx, dy) => {
      companions.forEach(m => m.position?.set({ x: m.start.x + dx, y: m.start.y + dy }));
    },
    commit: (primary, dx, dy) => {
      const manager = getEntityManager(workspace.instanceId);
      manager.moveEntity(primaryId, primary);
      companions.forEach(m => {
        const target = { x: m.start.x + dx, y: m.start.y + dy };
        m.position?.set(target);
        manager.moveEntity(m.id, target);
      });
      if (open) store.endTransaction();
      open = false;
    },
    cancel: () => {
      if (open) store.endTransaction();
      open = false;
    },
  };
};
