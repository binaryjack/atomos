import type { WorkspaceConfig } from '@atomos-web/structura-core'
import type { McpTransport } from '../../features/mcp-sync/mcp-transport.types.js'
import { createCanvasPage } from '../../pages/canvas-page/create-canvas-page.js'

export interface WebviewInitConfig {
  /**
   * REQUIRED: Unique instance ID for this webview.
   * Used to namespace localStorage keys and prevent collisions between multiple instances.
   * Must be unique per webview instance. Examples: 'schema-editor-1', 'canvas-panel-a', etc.
   */
  instanceId: string
  /**
   * Host-supplied MCP transport (supervised connection with reconnect/backoff).
   * atomos performs no network I/O: omit it to run standalone (canvas only, no sync).
   */
  mcpTransport?: McpTransport
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
  /** Optional callback whenever the internal Redux state changes */
  onStateChange?: (state: any) => void
  /**
   * Optional initial Redux state to hydrate the canvas with.
   * Useful when embedding the webview in a React component and you already have the schema data.
   */
  initialState?: any
}

export interface WebviewApp {
  /** The root canvas element (already mounted into the container) */
  readonly element: HTMLElement
  /** Disconnect MCP and destroy the canvas. Call in extension deactivation. */
  readonly disconnect: () => Promise<void>
  /** Get current raw Redux state of the webview */
  readonly getState: () => any
  /** 
   * API exposed for testing tools (e.g. Playwright) to bypass DOM simulation 
   * and programmatically interact with the canvas engine. 
   */
  readonly testApi?: Record<string, any>
  /** In-memory MCP transport */
  readonly handleMcpCall?: (toolName: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: 'text'; text: string }> }>
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
 * 5. Connects the MCP bridge (if an `mcpTransport` is provided)
 * 6. Enforces complete multi-instance isolation via instanceId
 *
 * #### Usage (v2.0.0+)
 * ```ts
 * import { initializeStructuraWebview } from '@atomos-web/structura/webview'
 *
 * const app = await initializeStructuraWebview({
 *   instanceId: 'webview-1',  // REQUIRED: unique identifier
 *   mcpTransport: hostTransport, // e.g. a StateKernel saga-backed transport
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
  const resolvedSchemaId = config?.schemaId || undefined

  // createCanvasPage handles design tokens, store initialization and the MCP binding
  // over the injected transport. instanceId guarantees per-instance storage isolation.
  const page = createCanvasPage(instanceId, config?.workspaceConfig, config?.mcpTransport, config?.onStateChange)

  // If initial state is provided, hydrate the store immediately.
  if (config?.initialState) {
    const { createInstanceReduxStore } = await import('../../shared/core/create-redux-store.js')
    const store = createInstanceReduxStore(undefined, instanceId)
    store.dispatch({ type: 'state-loaded', state: config.initialState })
  }

  // If a specific schema ID was provided (e.g. pre-provisioned by Extension Host),
  // activate it once the store is ready.
  if (resolvedSchemaId) {
    const {createInstanceReduxStore } = await import('../../shared/core/create-redux-store.js')
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
      if (typeof page.cleanup === 'function') {
        page.cleanup()
      }
      if ((page.cleanup as any)?.destroy) {
        (page.cleanup as any).destroy()
      }
    },
    getState: () => page.store.get_state(),
    testApi: {} as any,
    handleMcpCall: async () => ({ content: [] }),
  }
}
