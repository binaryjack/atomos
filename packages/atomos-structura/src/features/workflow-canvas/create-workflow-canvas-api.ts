// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import { getCanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';
import type { WorkflowCanvasDocument } from '../../shared/workflow-document/model/document.types.js';
import { exportCanvasDocument, importCanvasDocument } from '../workflow-document-io/canvas-document-io.js';
import { createGroupCommands } from './create-group-commands.js';
import { createNodeCommands } from './create-node-commands.js';
import { createSelectionCommands } from './create-selection-commands.js';
import type { WorkflowCanvasApi } from './workflow-canvas-api.types.js';

export interface WorkflowCanvasApiDeps {
  readonly instanceId: string;
  readonly store: ReduxStore;
  /** Re-syncs the SVG workspace with the store (after import / structural edits). */
  readonly reconcile: () => void;
  /** Applies an imported viewport to the live viewport. */
  readonly applyViewport: (viewport: WorkflowCanvasDocument['viewport']) => void;
}

/** Assembles the public workflow-designer API of one canvas instance. */
export const createWorkflowCanvasApi = (deps: WorkflowCanvasApiDeps): WorkflowCanvasApi => {
  const { instanceId, store } = deps;
  const runtime = getCanvasRuntime(instanceId);
  const nodes = createNodeCommands(instanceId, store, runtime, deps.reconcile);
  const selection = createSelectionCommands(instanceId, runtime);
  const groups = createGroupCommands(instanceId, store, deps.reconcile);

  return {
    nodeTypes: runtime.nodeTypes,
    overlay: runtime.overlay,
    ...nodes,
    ...groups,
    setConnectionValidator: validator => { runtime.validator = validator; },
    setConnectionOptions: options => { runtime.connectionOptions = { ...options }; },
    transaction: (label, fn) => store.transaction(label, fn),
    undo: () => store.undo(),
    redo: () => store.redo(),
    canUndo: () => store.can_undo(),
    canRedo: () => store.can_redo(),
    on: (event, handler) => runtime.events.on(event, handler),
    exportDocument: () => exportCanvasDocument(store),
    importDocument: input => importCanvasDocument(store, input, document => {
      deps.reconcile();
      deps.applyViewport(document.viewport);
      runtime.selection.clear();
    }),
    getSelection: () => runtime.selection.get(),
    setSelection: ids => runtime.selection.set(ids),
    selectAll: selection.selectAll,
    clearSelection: () => runtime.selection.clear(),
    deleteSelection: () => nodes.removeNodes(runtime.selection.get()),
    copySelection: selection.copySelection,
    paste: selection.paste,
  };
};
