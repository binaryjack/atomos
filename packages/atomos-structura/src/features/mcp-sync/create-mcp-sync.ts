// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import type { NodeState } from '../../shared/workflow-node/model/node-state.types.js';
import { applyMcpChange, type McpChangePayload } from './apply-mcp-change.js';
import { applyMcpWorkspaceEvent, type McpWorkspaceEvent } from './apply-mcp-workspace-event.js';
import type { McpStatus, McpToolResult, McpTransport } from './mcp-transport.types.js';
import { routeMcpServerEvent } from './route-mcp-server-event.js';

export type { Disposable, McpServerEvent, McpStatus, McpToolResult, McpTransport } from './mcp-transport.types.js';
export { mountMcpStatusBadge } from './create-mcp-status-badge.js';

export interface McpSyncOptions {
  /**
   * Host-supplied, supervised transport (connection, reconnect/backoff, delivery).
   * Without it only in-memory actions (`vbs-mcp-action` window events) are handled.
   */
  readonly transport?: McpTransport;
  /** Per-canvas target for `vbs-mcp-action` events (created when omitted). */
  readonly events?: EventTarget;
  /** Restricts window-level `vbs-mcp-action` proxies carrying an `instanceId` to this canvas. */
  readonly instanceId?: string;
  /** Receives `node-progress` events — routed to the runtime overlay, never to the document. */
  readonly onNodeProgress?: (nodeId: string, state: NodeState) => void;
  /** Called after remote entity/link changes were applied (lets the editor reconcile its DOM). */
  readonly onRemoteChange?: () => void;
}

export interface McpSyncResult {
  readonly cleanup: () => void;
  /** This canvas's MCP action bus (`vbs-mcp-action` CustomEvents). */
  readonly events: EventTarget;
  /** Latest transport status (`idle` when no transport was supplied). */
  readonly status: () => McpStatus;
  readonly onStatus: (listener: (status: McpStatus) => void) => () => void;
}

const guarded = (options: McpSyncOptions, fn: () => void): (() => void) => {
  let busy = false;
  return () => {
    if (busy) return;
    busy = true;
    try { fn(); } finally { busy = false; }
    options.onRemoteChange?.();
  };
};

/** In-memory actions (handleMcpCall / window proxy) only drive undo and redo here. */
const bindInMemory = (store: ReduxStore, events: EventTarget, options: McpSyncOptions): (() => void) => {
  const onAction = (e: Event): void => {
    const { action, sendResult, mcpUrl } = (e as CustomEvent).detail as { action?: string; sendResult?: (r: unknown) => void; mcpUrl?: string };
    if (mcpUrl !== 'in-memory') return;
    if (action === 'structura_undo') { store.undo(); sendResult?.({}); }
    if (action === 'structura_redo') { store.redo(); sendResult?.({}); }
  };
  const onWindow = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { instanceId?: string } | null;
    if (detail?.instanceId && options.instanceId && detail.instanceId !== options.instanceId) return;
    events.dispatchEvent(new CustomEvent('vbs-mcp-action', { detail: { ...detail, mcpUrl: 'in-memory' } }));
  };
  events.addEventListener('vbs-mcp-action', onAction);
  if (typeof window !== 'undefined') window.addEventListener('vbs-mcp-action', onWindow);
  return () => {
    events.removeEventListener('vbs-mcp-action', onAction);
    if (typeof window !== 'undefined') window.removeEventListener('vbs-mcp-action', onWindow);
  };
};

/**
 * Binds a canvas store to an MCP server through an injected transport. This module never
 * opens sockets or performs HTTP calls: it only consumes transport events and hands tool
 * results back to `transport.send`.
 */
export const createMcpSync = (store: ReduxStore, options: McpSyncOptions = {}): McpSyncResult => {
  const events = options.events ?? new EventTarget();
  const statusListeners = new Set<(status: McpStatus) => void>();
  let status: McpStatus = 'idle';
  let pendingChange: McpChangePayload | undefined;
  let pendingWorkspace: McpWorkspaceEvent | undefined;
  const runChange = guarded(options, () => { if (pendingChange) applyMcpChange(store, pendingChange); });
  const runWorkspace = guarded(options, () => { if (pendingWorkspace) applyMcpWorkspaceEvent(store, pendingWorkspace); });
  const setStatus = (next: McpStatus): void => {
    if (next === status) return;
    status = next;
    statusListeners.forEach(listener => listener(next));
  };
  const send = (result: McpToolResult): void => {
    options.transport?.send(result).catch((error: unknown) => console.error('[Structura] MCP tool result failed:', error));
  };
  const unbindInMemory = bindInMemory(store, events, options);
  const connection = options.transport?.connect(event => routeMcpServerEvent(event, {
    store, events, send, onNodeProgress: options.onNodeProgress,
    applyChange: data => { pendingChange = data; runChange(); },
    applyWorkspaceEvent: data => { pendingWorkspace = data; runWorkspace(); },
  }), setStatus);
  return {
    events,
    status: () => status,
    onStatus: listener => { statusListeners.add(listener); return () => { statusListeners.delete(listener); }; },
    cleanup: () => {
      unbindInMemory();
      connection?.dispose();
      setStatus(options.transport ? 'disconnected' : 'idle');
      statusListeners.clear();
    },
  };
};
