// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { McpServerEvent, McpStatus, McpToolResult, McpTransport } from './mcp-transport.types.js';

/** Synchronous in-process transport: for tests, demos and hosts bridging their own channel. */
export interface InMemoryMcpTransport {
  readonly transport: McpTransport;
  /** Delivers a server event (payload is JSON-encoded like an SSE `data` field). */
  readonly emit: (type: string, payload: unknown) => void;
  /** Delivers a raw (possibly malformed) event. */
  readonly emitRaw: (event: McpServerEvent) => void;
  /** Reports a connection status change to the connected sync. */
  readonly setStatus: (status: McpStatus) => void;
  /** Tool results sent back by the canvas, in order. */
  readonly sent: readonly McpToolResult[];
  readonly isConnected: () => boolean;
}

export const createInMemoryMcpTransport = (): InMemoryMcpTransport => {
  let onEvent: ((event: McpServerEvent) => void) | undefined;
  let onStatus: ((status: McpStatus) => void) | undefined;
  const sent: McpToolResult[] = [];
  const transport: McpTransport = {
    connect: (eventHandler, statusHandler) => {
      onEvent = eventHandler;
      onStatus = statusHandler;
      statusHandler('connected');
      return { dispose: () => { onEvent = undefined; onStatus = undefined; } };
    },
    send: async result => { sent.push(result); },
  };
  return {
    transport,
    emit: (type, payload) => onEvent?.({ type, data: JSON.stringify(payload) }),
    emitRaw: event => onEvent?.(event),
    setStatus: status => onStatus?.(status),
    sent,
    isConnected: () => onEvent !== undefined,
  };
};
