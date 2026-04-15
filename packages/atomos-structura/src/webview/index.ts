import type { WorkspaceConfig } from '@atomos-web/structura-core'
import { createCanvasPage } from '../preview/create-canvas-page.js'

export interface WebviewInitConfig {
  /**
   * MCP server base URL (e.g. http://localhost:3001).
   * When provided, enables bidirectional sync between the canvas and the MCP server.
   * Omit to run in standalone mode (canvas only, no sync).
   */
  mcpServerUrl?: string
  /**
   * ID of the container element to mount the canvas into.
   * Defaults to 'app'.
   */
  containerId?: string
  /**
   * Optional workspace configuration forwarded to the canvas store.
   */
  workspaceConfig?: WorkspaceConfig
}

export interface WebviewApp {
  /** The root canvas element (already mounted into the container) */
  readonly element: HTMLElement
  /** Disconnect MCP and destroy the canvas. Call in extension deactivation. */
  readonly disconnect: () => Promise<void>
}

/**
 * Zero-config entry point for VS Code extension webviews.
 *
 * #### What it does:
 * 1. Injects Structura design system CSS tokens
 * 2. Initialises the Redux store
 * 3. Creates and mounts the full canvas UI
 * 4. Connects the MCP bridge (if `mcpServerUrl` is provided)
 *
 * #### Usage
 * ```ts
 * import { initializeStructuraWebview } from '@atomos-web/structura/webview'
 *
 * const app = await initializeStructuraWebview({
 *   mcpServerUrl: 'http://localhost:9743',
 *   containerId: 'app',
 * })
 *
 * // Later, on cleanup:
 * await app.disconnect()
 * ```
 */
export const initializeStructuraWebview = async (
  config?: WebviewInitConfig,
): Promise<WebviewApp> => {
  const containerId = config?.containerId ?? 'app'

  const container = document.getElementById(containerId)
  if (!container) throw new Error(
    `[Structura Webview] Container element #${containerId} not found. ` +
    'Make sure the element exists in the HTML before calling initializeStructuraWebview().'
  )

  // createCanvasPage handles injectDesignSystemTokens, getGlobalReduxStore,
  // and the MCP SSE connection internally — passing mcpServerUrl routes all
  // three through a single code path and prevents a double SSE connection.
  const page = createCanvasPage(config?.workspaceConfig, config?.mcpServerUrl)
  container.appendChild(page.element)

  return {
    element: page.element,
    disconnect: async () => {
      page.cleanup.destroy()
    },
  }
}
