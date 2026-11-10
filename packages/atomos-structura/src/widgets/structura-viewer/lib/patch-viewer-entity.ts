// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { applyNodeOverlay } from '../../../features/node-overlay/apply-node-overlay.js';
import type { ExecutionStatus } from '../../../shared/core/types/execution.types.js';
import type { EntityInstance } from '../../../shared/core/types/entity-instance.types.js';
import type { EntityInspectorStatus } from '../types/inspector.types.js';
import { isNodeStatus, type NodeState, type NodeStatus, normalizeProgress } from '../../../shared/workflow-node/model/node-state.types.js';

/** Execution details forwarded to the node body and the inspector drawer. */
export interface ViewerExecutionPatch extends Readonly<Record<string, unknown>> {
  readonly status?: EntityInspectorStatus;
  readonly thinkingLog?: string;
  readonly error?: string;
  readonly durationMs?: number;
}

/** Incremental viewer update. Accepts the editor overlay `NodeState` fields directly. */
export interface ViewerEntityPatch {
  readonly position?: { x: number; y: number };
  readonly dimensions?: { width: number; height: number };
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly execution?: Readonly<Record<string, unknown>>;
  readonly status?: NodeStatus;
  readonly label?: string;
  readonly progress?: number;
}

const EXECUTION_STATUS: Readonly<Record<NodeStatus, ExecutionStatus>> = {
  idle: 'idle', queued: 'warning', waiting: 'warning', running: 'running', succeeded: 'success', failed: 'failed', skipped: 'idle',
};

const toNodeState = (updates: ViewerEntityPatch): NodeState | undefined => {
  if (!isNodeStatus(updates.status)) return undefined;
  const progress = normalizeProgress(updates.progress);
  return {
    status: updates.status,
    ...(updates.label !== undefined ? { label: updates.label } : {}),
    ...(progress !== undefined ? { progress } : {}),
  };
};

type MetadataInput = Parameters<NonNullable<EntityInstance['updateMetadata']>>[0];

/** Applies a patch to one rendered viewer node without rebuilding the schema. */
export const patchViewerEntity = (entity: EntityInstance, updates: ViewerEntityPatch): void => {
  if (updates.position) entity.position.set(updates.position);
  if (updates.dimensions) entity.dimensions.set(updates.dimensions);
  if (updates.metadata) entity.updateMetadata?.(updates.metadata as MetadataInput);
  const signal = entity.executionSignal;
  if (updates.execution && signal) signal.set({ ...signal.value, ...updates.execution });
  const state = toNodeState(updates);
  if (!state) return;
  if (signal) {
    const progress = state.progress !== undefined ? { progress: state.progress } : {};
    signal.set({ ...signal.value, status: EXECUTION_STATUS[state.status], message: state.label, ...progress });
  }
  applyNodeOverlay(entity.element, state, entity.dimensions.value);
};
