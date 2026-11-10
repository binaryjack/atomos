// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Releases a subscription / connection. */
export interface Disposable {
  readonly dispose: () => void;
}

/** Connection state reported by the host transport (shown on the canvas toolbar). */
export type McpStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

/** One server event: `type` is the SSE event name, `data` its raw JSON payload. */
export interface McpServerEvent {
  readonly type: string;
  readonly data: string;
}

/** Result of a `frontend-action-request`, sent back to the MCP server. */
export interface McpToolResult {
  readonly reqId: string;
  readonly result?: unknown;
  readonly error?: string;
}

/**
 * Injected transport port. atomos performs no network I/O itself: the host supplies a
 * supervised transport (e.g. a StateKernel saga) that owns connection, reconnection with
 * backoff, and delivery. `connect` must report every status change through `onStatus`.
 */
export interface McpTransport {
  readonly connect: (onEvent: (event: McpServerEvent) => void, onStatus: (status: McpStatus) => void) => Disposable;
  readonly send: (result: McpToolResult) => Promise<void>;
}
