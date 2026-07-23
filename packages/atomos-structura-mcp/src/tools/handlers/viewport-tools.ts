import { emit_sse, get_active_canvas } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

export function registerViewportTools(): void {
  // 1. structura_get_viewport
  toolRegistry.registerTool(
    {
      name: 'structura_get_viewport',
      description: 'Get current active viewport pan and zoom.',
      inputSchema: { type: 'object', properties: {} }
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => {
      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };
      return { result: { viewport: canvas.viewport }, id: reqId };
    }
  );

  // 2. structura_set_zoom
  toolRegistry.registerTool(
    {
      name: 'structura_set_zoom',
      description: 'Sets the zoom level of the canvas.',
      inputSchema: {
        type: 'object',
        properties: { level: { type: 'number' } },
        required: ['level']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      if (srv._state.workspace.config?.menu?.zoom?.available === false) {
        return { error: { code: 403, message: 'Feature not available' }, id: reqId };
      }
      const level = Number(args.level ?? 1);
      const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };

      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, viewport: { ...canvas.viewport, zoom: clamped } }
          }
        }
      };

      emit_sse(srv._clients, 'viewport-updated', { viewport: srv._state.workspace.canvases[canvasId]!.viewport });
      return { result: { success: true, zoom: clamped }, id: reqId };
    }
  );

  // 3. structura_set_pan
  toolRegistry.registerTool(
    {
      name: 'structura_set_pan',
      description: 'Sets the pan coordinates of the canvas.',
      inputSchema: {
        type: 'object',
        properties: { x: { type: 'number' }, y: { type: 'number' } },
        required: ['x', 'y']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const x = Number(args.x ?? 0);
      const y = Number(args.y ?? 0);
      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };

      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, viewport: { ...canvas.viewport, pan: { x, y } } }
          }
        }
      };

      emit_sse(srv._clients, 'viewport-updated', { viewport: srv._state.workspace.canvases[canvasId]!.viewport });
      return { result: { success: true, pan: { x, y } }, id: reqId };
    }
  );

  // 4. structura_center_on_screen
  toolRegistry.registerTool(
    {
      name: 'structura_center_on_screen',
      description: 'Centers the view of the canvas on the screen.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      if (srv._state.workspace.config?.menu?.center_on_screen?.available === false) {
        return { error: { code: 403, message: 'Feature not available' }, id: reqId };
      }
      const width = Number(args.width ?? 800);
      const height = Number(args.height ?? 600);

      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };
      const schema = canvas.schemas[canvas.active_schema_id];
      if (!schema || schema.entities.length === 0) {
        return { result: { success: true, skipped: true }, id: reqId };
      }

      const { zoom } = canvas.viewport;
      let sumX = 0, sumY = 0;
      schema.entities.forEach(e => {
        sumX += e.position.x + (e.dimensions?.width ?? 0) / 2;
        sumY += e.position.y + (e.dimensions?.height ?? 0) / 2;
      });

      const cx = sumX / schema.entities.length;
      const cy = sumY / schema.entities.length;
      const pan = { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom };

      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, viewport: { zoom, pan } }
          }
        }
      };

      emit_sse(srv._clients, 'viewport-updated', { viewport: { zoom, pan } });
      return { result: { success: true, viewport: { zoom, pan } }, id: reqId };
    }
  );

  // 5. structura_fit_to_screen
  toolRegistry.registerTool(
    {
      name: 'structura_fit_to_screen',
      description: 'Fits the view of the canvas to fit the bounding box of all nodes.',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      if (srv._state.workspace.config?.menu?.fit_to_screen?.available === false) {
        return { error: { code: 403, message: 'Feature not available' }, id: reqId };
      }
      const width = Number(args.width ?? 800);
      const height = Number(args.height ?? 600);
      const padding = Number(args.padding ?? 100);

      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };
      const schema = canvas.schemas[canvas.active_schema_id];
      if (!schema || schema.entities.length === 0) {
        return { result: { success: true, skipped: true }, id: reqId };
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      schema.entities.forEach(e => {
        const w = e.dimensions?.width ?? 0;
        const h = e.dimensions?.height ?? 0;
        minX = Math.min(minX, e.position.x);
        minY = Math.min(minY, e.position.y);
        maxX = Math.max(maxX, e.position.x + w);
        maxY = Math.max(maxY, e.position.y + h);
      });

      const boxW = Math.max(maxX - minX, 1);
      const boxH = Math.max(maxY - minY, 1);
      const zoom = Math.min(
        Math.min((width - padding * 2) / boxW, (height - padding * 2) / boxH),
        2
      );

      const cx = minX + boxW / 2;
      const cy = minY + boxH / 2;
      const pan = { x: width / 2 - cx * zoom, y: height / 2 - cy * zoom };

      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, viewport: { zoom, pan } }
          }
        }
      };

      emit_sse(srv._clients, 'viewport-updated', { viewport: { zoom, pan } });
      return { result: { success: true, viewport: { zoom, pan } }, id: reqId };
    }
  );

  // 6. structura_set_canvas_appearance
  toolRegistry.registerTool(
    {
      name: 'structura_set_canvas_appearance',
      description: 'Sets the appearance override (theme) for the active canvas.',
      inputSchema: {
        type: 'object',
        properties: { appearance: { type: 'string' } },
        required: ['appearance']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };
      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, appearance_override: args.appearance as any }
          }
        }
      };
      emit_sse(srv._clients, 'canvas-appearance-updated', { canvas_id: canvasId, appearance: args.appearance });
      return { result: { success: true }, id: reqId };
    }
  );

  // 7. structura_configure_viewport_permissions
  toolRegistry.registerTool(
    {
      name: 'structura_configure_viewport_permissions',
      description: 'Configure viewport interaction permissions (enable/disable zoom, pan, or layout toggle).',
      inputSchema: {
        type: 'object',
        properties: {
          enable_zoom: { type: 'boolean' },
          enable_pan: { type: 'boolean' },
          enable_layout_toggle: { type: 'boolean' }
        }
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const enableZoom = typeof args.enable_zoom === 'boolean' ? args.enable_zoom : true;
      const enablePan = typeof args.enable_pan === 'boolean' ? args.enable_pan : true;
      const enableLayoutToggle = typeof args.enable_layout_toggle === 'boolean' ? args.enable_layout_toggle : true;

      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          settings: {
            ...srv._state.workspace.settings,
            enable_zoom: enableZoom,
            enable_pan: enablePan,
            enable_layout_toggle: enableLayoutToggle
          }
        }
      };

      emit_sse(srv._clients, 'viewport-permissions-updated', {
        enable_zoom: enableZoom,
        enable_pan: enablePan,
        enable_layout_toggle: enableLayoutToggle
      });

      return {
        result: {
          success: true,
          permissions: {
            enable_zoom: enableZoom,
            enable_pan: enablePan,
            enable_layout_toggle: enableLayoutToggle
          }
        },
        id: reqId
      };
    }
  );
}
