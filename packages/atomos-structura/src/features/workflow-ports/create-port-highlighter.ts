// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import { getCanvasRuntime, type PortHandleRecord } from '../../shared/workflow-canvas/canvas-runtime.js';
import { previewConnection } from '../../shared/workflow-canvas/connection-gate.js';
import { parsePortAnchorId } from '../../shared/workflow-node/model/port-anchor.js';

const resetHandle = (record: PortHandleRecord): void => {
  delete record.element.dataset.connectable;
  record.element.style.opacity = '';
  record.element.querySelector('circle')?.setAttribute('r', '6');
};

const markHandle = (record: PortHandleRecord, connectable: boolean, reason: string | undefined): void => {
  record.element.dataset.connectable = String(connectable);
  record.element.style.opacity = connectable ? '1' : '0.25';
  record.element.querySelector('circle')?.setAttribute('r', connectable ? '8' : '6');
  if (reason) record.element.setAttribute('data-reject-reason', reason);
  else record.element.removeAttribute('data-reject-reason');
};

/**
 * While a connection is dragged from a typed output port, highlights every input port
 * the connection validator would accept and dims the incompatible ones.
 */
export const createPortHighlighter = function(workspace: WorkspaceManager, instanceId: string): () => void {
  const runtime = getCanvasRuntime(instanceId);
  let active = false;

  const highlight = (sourceAnchorId: string): void => {
    const source = parsePortAnchorId(sourceAnchorId);
    if (!source) return;
    active = true;
    runtime.portHandles.forEach(record => {
      if (record.port.direction !== 'in') {
        markHandle(record, false, undefined);
        return;
      }
      const verdict = previewConnection(
        instanceId,
        { entityId: source.nodeId, anchorId: sourceAnchorId },
        { entityId: record.nodeId, anchorId: record.anchorId },
      );
      markHandle(record, verdict.ok, verdict.ok ? undefined : verdict.reason);
    });
  };

  const clear = (): void => {
    if (!active) return;
    active = false;
    runtime.portHandles.forEach(resetHandle);
  };

  return workspace.behaviorManager.behaviorState.subscribe(state => {
    if (state.linkCreation === 'drawing' && state.sourceAnchorId) {
      if (!active) highlight(state.sourceAnchorId);
    } else {
      clear();
    }
  });
};
