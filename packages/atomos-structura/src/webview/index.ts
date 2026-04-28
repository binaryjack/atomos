import type { WorkspaceConfig } from '@atomos-web/structura-core'
import { createCanvasPage } from '../preview/create-canvas-page.js'

export interface WebviewInitConfig {
  /**
   * REQUIRED: Unique instance ID for this webview.
   * Used to namespace localStorage keys and prevent collisions between multiple instances.
   * Must be unique per webview instance. Examples: 'schema-editor-1', 'canvas-panel-a', etc.
   */
  instanceId: string
  /**
   * MCP server base URL (e.g. http://localhost:3001).
   * When provided, enables bidirectional sync between the canvas and the MCP server.
   * Omit (or pass an empty string) to run in standalone mode (canvas only, no sync).
   * The template.html ships with the `${mcpUrl}` token — consuming extensions use
   * `.replaceAll('${mcpUrl}', actualUrl)` to inject the value.
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
  /**
   * Optional initial schema ID. When provided the canvas will activate this
   * schema on startup (useful when the Extension Host provisions the schema via
   * MCP before mounting the webview).
   * The template.html ships with the `${schemaId}` token — consuming extensions
   * use `.replaceAll('${schemaId}', actualId)` to inject the value.
   */
  schemaId?: string
}

export interface WebviewApp {
  /** The root canvas element (already mounted into the container) */
  readonly element: HTMLElement
  /** Disconnect MCP and destroy the canvas. Call in extension deactivation. */
  readonly disconnect: () => Promise<void>
}

const generateInstanceId = (): string => {
  return `instance-${Math.random().toString(36).slice(2, 9)}-${Date.now()}`
}

/**
 * Zero-config entry point for VS Code extension webviews.
 *
 * #### BREAKING CHANGE (v2.0.0)
 * `instanceId` is now **REQUIRED** for all webviews. This ensures true per-instance
 * isolation with no global state collisions. Auto-generation is removed.
 *
 * #### What it does:
 * 1. Validates that instanceId is provided
 * 2. Injects Structura design system CSS tokens (scoped to container)
 * 3. Initialises a per-instance Redux store (never global)
 * 4. Creates and mounts the full canvas UI
 * 5. Connects the MCP bridge (if `mcpServerUrl` is provided)
 * 6. Enforces complete multi-instance isolation via instanceId
 *
 * #### Usage (v2.0.0+)
 * ```ts
 * import { initializeStructuraWebview } from '@atomos-web/structura/webview'
 *
 * const app = await initializeStructuraWebview({
 *   instanceId: 'webview-1',  // REQUIRED: unique identifier
 *   mcpServerUrl: 'http://localhost:9743',
 *   containerId: 'app',
 * })
 *
 * // Later, on cleanup:
 * await app.disconnect()
 * ```
 */
export const initializeStructuraWebview = async (config: WebviewInitConfig): Promise<WebviewApp> => {
  // BREAKING: instanceId is now REQUIRED with no auto-generation
  if (!config.instanceId || config.instanceId.trim().length === 0) {
    throw new Error(
      '[Structura Webview v2.0.0] instanceId is REQUIRED and must be non-empty. '
      + 'Provide a unique identifier per webview instance (e.g., "schema-editor-1"). '
      + 'Auto-generation has been removed to prevent accidental state collisions.'
    )
  }

  const instanceId = config.instanceId
  const containerId = config.containerId ?? 'app'

  const container = document.getElementById(containerId)
  if (!container) throw new Error(
    `[Structura Webview] Container element #${containerId} not found. ` +
    'Make sure the element exists in the HTML before calling initializeStructuraWebview().'
  )

  // Normalise token-injected values: empty strings from un-replaced template tokens
  // are treated the same as omitted options so standalone mode still works.
  const resolvedMcpUrl = config?.mcpServerUrl || undefined
  const resolvedSchemaId = config?.schemaId || undefined

  // createCanvasPage handles injectDesignSystemTokens, store initialization,
  // and the MCP SSE connection internally — passing mcpServerUrl routes all
  // through a single code path and prevents a double SSE connection.
  // Pass instanceId to ensure per-instance localStorage isolation.
  const page = createCanvasPage(instanceId, config?.workspaceConfig, resolvedMcpUrl)

  // If a specific schema ID was provided (e.g. pre-provisioned by Extension Host),
  // activate it once the store is ready.
  if (resolvedSchemaId) {
    const {createInstanceReduxStore } = await import('../core/create-redux-store.js')
    const store = createInstanceReduxStore(undefined, instanceId)
    const canvas = store.get_state().workspace.canvases[store.get_state().workspace.active_canvas_id]
    if (canvas?.schemas[resolvedSchemaId]) {
      store.dispatch({ type: 'schema-activated', id: resolvedSchemaId })
    }
  }
  container.appendChild(page.element)

  return {
    element: page.element,
    disconnect: async () => {
      page.cleanup.destroy()
    },
  }
}
