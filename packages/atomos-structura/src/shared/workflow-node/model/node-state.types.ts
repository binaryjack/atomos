// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Runtime execution status of a node. Never persisted, never undoable. */
export type NodeStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'waiting';

export const NODE_STATUSES: readonly NodeStatus[] = [
  'idle', 'queued', 'running', 'succeeded', 'failed', 'skipped', 'waiting',
];

/** Runtime overlay state of one node. `progress` is a ratio in [0, 1]. */
export interface NodeState {
  readonly status: NodeStatus;
  readonly label?: string;
  readonly progress?: number;
}

/** Runtime overlay state of one edge. */
export interface EdgeState {
  readonly active: boolean;
}

export const isNodeStatus = (value: unknown): value is NodeStatus =>
  typeof value === 'string' && (NODE_STATUSES as readonly string[]).includes(value);

/** Colors used by the overlay renderers (editor and viewer). */
export const NODE_STATUS_COLORS: Readonly<Record<NodeStatus, string>> = {
  idle: '#64748b',
  queued: '#a78bfa',
  running: '#3b82f6',
  succeeded: '#22c55e',
  failed: '#ef4444',
  skipped: '#94a3b8',
  waiting: '#eab308',
};

/** Clamps progress into [0, 1]; returns undefined for non-finite input. */
export const normalizeProgress = (progress: number | undefined): number | undefined => {
  if (progress === undefined || !Number.isFinite(progress)) return undefined;
  return Math.min(1, Math.max(0, progress));
};
