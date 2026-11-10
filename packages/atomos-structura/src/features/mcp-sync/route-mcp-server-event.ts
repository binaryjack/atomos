// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import type { NodeState } from '../../shared/workflow-node/model/node-state.types.js';
import { type McpChangePayload, toNodeState } from './apply-mcp-change.js';
import type { McpWorkspaceEvent } from './apply-mcp-workspace-event.js';
import type { McpServerEvent, McpToolResult } from './mcp-transport.types.js';

export interface McpRouteContext {
  readonly store: ReduxStore;
  /** Per-canvas `vbs-mcp-action` bus (toolbar / page handlers). */
  readonly events: EventTarget;
  readonly applyChange: (data: McpChangePayload) => void;
  readonly applyWorkspaceEvent: (event: McpWorkspaceEvent) => void;
  readonly onNodeProgress?: ((nodeId: string, state: NodeState) => void) | undefined;
  readonly send: (result: McpToolResult) => void;
}

type Route = (payload: unknown, ctx: McpRouteContext) => void;

const record = (value: unknown): Record<string, unknown> =>
  (typeof value === 'object' && value !== null ? value as Record<string, unknown> : {});

const frontendAction: Route = (payload, ctx) => {
  const data = record(payload);
  const reqId = typeof data['reqId'] === 'string' ? data['reqId'] : '';
  const sendResult = (result: unknown = {}, error?: string): void =>
    ctx.send({ reqId, result, ...(error !== undefined ? { error } : {}) });
  if (data['action'] === 'structura_undo') { ctx.store.undo(); sendResult(); return; }
  if (data['action'] === 'structura_redo') { ctx.store.redo(); sendResult(); return; }
  ctx.events.dispatchEvent(new CustomEvent('vbs-mcp-action', { detail: { ...data, sendResult } }));
};

const ROUTES: Readonly<Record<string, Route>> = {
  change: (payload, ctx) => {
    const data = record(payload);
    if (Array.isArray(data['entities']) && Array.isArray(data['links'])) ctx.applyChange(data as unknown as McpChangePayload);
  },
  workspace: (payload, ctx) => {
    if (typeof record(payload)['type'] === 'string') ctx.applyWorkspaceEvent(payload as McpWorkspaceEvent);
  },
  // Runtime progress goes to the overlay API: never into undoable entity properties.
  'node-progress': (payload, ctx) => {
    const data = record(payload);
    if (typeof data['node_id'] === 'string') ctx.onNodeProgress?.(data['node_id'], toNodeState(data));
  },
  'viewport-updated': (payload, ctx) => {
    const viewport = record(payload)['viewport'];
    if (viewport) ctx.store.dispatch({ type: 'viewport-updated', viewport: viewport as never });
  },
  'canvas-appearance-updated': (payload, ctx) => {
    const data = record(payload);
    if (typeof data['canvas_id'] === 'string' && data['appearance'] !== undefined) {
      ctx.store.dispatch({ type: 'canvas-appearance-updated', canvas_id: data['canvas_id'], appearance: data['appearance'] as never });
    }
  },
  'frontend-action-request': frontendAction,
  // Legacy servers emit progress reports directly; they expect no tool result.
  structura_report_progress: (payload, ctx) => {
    const data = record(payload);
    const reqId = typeof data['reqId'] === 'string' ? data['reqId'] : '';
    ctx.events.dispatchEvent(new CustomEvent('vbs-mcp-action', {
      detail: { action: 'structura_report_progress', reqId, args: data, sendResult: () => undefined },
    }));
  },
};

/** Parses and routes one server event. Malformed or unknown events are ignored. */
export const routeMcpServerEvent = (event: McpServerEvent, ctx: McpRouteContext): void => {
  const route = ROUTES[event.type];
  if (!route) return;
  let payload: unknown;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }
  route(payload, ctx);
};
