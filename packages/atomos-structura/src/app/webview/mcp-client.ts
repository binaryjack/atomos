// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxStore } from '../../shared/types/redux-state.types.js'
import { createMcpSync } from '../../features/mcp-sync/create-mcp-sync.js'
import type { McpStatus, McpTransport } from '../../features/mcp-sync/mcp-transport.types.js'

export interface McpClientConfig {
  /** Host-supplied, supervised transport (atomos performs no network I/O). */
  transport: McpTransport
  /** Redux store to sync into */
  store: ReduxStore
}

export interface McpClient {
  /** Whether the transport currently reports a live connection */
  readonly connected: boolean
  /** Latest transport status */
  readonly status: McpStatus
  /** Disconnect and release the transport subscription */
  readonly disconnect: () => void
}

/**
 * Connects a canvas store to an MCP server through an injected transport.
 * MCP -> canvas: entity / link / workspace updates are applied to the store.
 */
export const createMcpClient = (config: McpClientConfig): McpClient => {
  const sync = createMcpSync(config.store, { transport: config.transport })
  let disposed = false

  return {
    get connected() { return !disposed && sync.status() === 'connected' },
    get status() { return sync.status() },
    disconnect: () => {
      if (disposed) return
      disposed = true
      sync.cleanup()
    },
  }
}
