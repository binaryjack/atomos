import type { ReduxStore } from '../types/redux-state.types.js'
import { createMcpSync } from '../features/mcp-sync/create-mcp-sync.js'

export interface McpClientConfig {
  /** MCP server base URL, e.g. http://localhost:9743 */
  mcpServerUrl: string
  /** Redux store to sync into */
  store: ReduxStore
}

export interface McpClient {
  /** Whether the SSE connection is currently alive */
  readonly connected: boolean
  /** Disconnect and clean up the SSE stream */
  readonly disconnect: () => void
}

/**
 * Creates a lightweight MCP client that connects the Structura canvas
 * to a running MCP server via SSE (Server-Sent Events).
 *
 * Handles bidirectional sync:
 * - MCP → Canvas: entity / link updates applied to Redux store
 * - Canvas → MCP: not needed -- MCP server polls Redux state on demand
 */
export const createMcpClient = (config: McpClientConfig): McpClient => {
  const sync = createMcpSync(config.store, config.mcpServerUrl)
  let alive = true

  return {
    get connected() { return alive },
    disconnect: () => {
      alive = false
      sync.cleanup()
    }
  }
}
