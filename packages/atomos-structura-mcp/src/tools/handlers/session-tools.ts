import { emit_sse, get_active_canvas, make_default_schema } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export function registerSessionTools(): void {
  // 1. structura_session_close
  toolRegistry.registerTool(
    {
      name: 'structura_session_close',
      description: 'Close current MCP session.',
      inputSchema: { type: 'object', properties: {} }
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => {
      try {
        if (typeof srv._cfg?.onSessionClose === 'function') {
          srv._cfg.onSessionClose();
        }
      } catch {
        /* noop */
      }
      return { result: { success: true }, id: reqId };
    }
  );

  // 2. structura_session_clear_memory
  toolRegistry.registerTool(
    {
      name: 'structura_session_clear_memory',
      description: 'Clear canvas entity memory and reset viewport.',
      inputSchema: { type: 'object', properties: {} }
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => {
      try {
        if (typeof srv._cfg?.onClearMemory === 'function') {
          srv._cfg.onClearMemory();
        }
      } catch {
        /* noop */
      }

      const canvas = get_active_canvas(srv._state);
      if (canvas) {
        const activeSchemaId = canvas.active_schema_id;
        const schema = canvas.schemas[activeSchemaId];
        const canvasId = srv._state.workspace.active_canvas_id;

        srv._state = {
          ...srv._state,
          workspace: {
            ...srv._state.workspace,
            canvases: {
              ...srv._state.workspace.canvases,
              [canvasId]: {
                ...canvas,
                viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
                schemas: {
                  ...canvas.schemas,
                  [activeSchemaId]: schema ? { ...schema, entities: [], links: [] } : make_default_schema(activeSchemaId)
                }
              }
            }
          }
        };

        emit_sse(srv._clients, 'workspace', { type: 'state-loaded', state: srv._state });
      }

      return { result: { success: true }, id: reqId };
    }
  );
}
