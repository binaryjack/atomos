import { dagExchangeSchema } from '@atomos-web/structura-core';
import { f } from '@binaryjack/formular.dev';
import { DEFAULT_CANVAS_ID, DEFAULT_SCHEMA_ID, emit_sse, find_canvas_for_schema, get_active_canvas, get_active_schema, make_default_schema } from '../../domain/workspace-helpers.js';
import type { CanvasModel, McpResponse, SchemaModel, VbsMcpServerInstance, WorkspaceState } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

interface ValidationErrorItem {
  path?: string[];
  message?: string;
}

const formatValidationErrors = (errors: unknown[]): string => {
  if (!errors || !Array.isArray(errors)) return 'Unknown validation error';
  return errors
    .map(errObj => {
      const err = errObj as ValidationErrorItem;
      const path = err.path && err.path.length > 0 ? err.path.join('.') : 'root';
      const msg = err.message || JSON.stringify(err);
      if (msg.includes('nodes') || msg.includes("Unrecognized key(s) in object: 'nodes'")) {
        return `[Structura Error] Key 'nodes' forbidden at path '${path}'. The root array must be named 'entities' or 'nodes' is invalid.`;
      }
      if (msg.includes('edges') || msg.includes("Unrecognized key(s) in object: 'edges'")) {
        return `[Structura Error] Key 'edges' forbidden at path '${path}'. Connections must be named 'links' or 'edges' is invalid.`;
      }
      return `[Structura Error] Path '${path}': ${msg}`;
    })
    .join('\n');
};

export function registerSchemaTools(): void {
  // 1. structura_get_schema
  toolRegistry.registerTool(
    {
      name: 'structura_get_schema',
      description: 'Retrieve the current state of a schema on the Erathos canvas.',
      inputSchema: {
        type: 'object',
        properties: { schema_id: { type: 'string' } },
        required: ['schema_id']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const schemaId = args.schema_id as string | undefined;
      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: reqId };
      if (schemaId && schemaId !== canvas.active_schema_id) {
        const schema = canvas.schemas[schemaId];
        if (!schema) return { error: { code: 404, message: 'Schema not found' }, id: reqId };
        return { result: { schema: { ...schema, metadata: { version: '1.0.0' } } }, id: reqId };
      }
      const schema = get_active_schema(srv._state);
      return { result: { schema: { ...schema, metadata: { createdAt: Date.now(), version: '1.0.0' } } }, id: reqId };
    }
  );

  // 2. structura_inject_schema
  toolRegistry.registerTool(
    {
      name: 'structura_inject_schema',
      description: 'Inject a schema or workspace into Structura. Replaces all legacy load methods.',
      inputSchema: {
        type: 'object',
        properties: {
          formatType: { type: 'string', enum: ['DAGExchange', 'WorkspaceState'], description: 'The format of the payload' },
          payload: { type: 'object', description: 'The JSON payload to inject' }
        },
        required: ['formatType', 'payload']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): Promise<McpResponse> => {
      const payload = args.payload;
      const result = f.validateSchema(dagExchangeSchema, payload);

      const mode = srv._state.workspace.config?.validationMode || 'passive';
      let formattedErrors: string | undefined;
      if (!result.success && result.errors) {
        formattedErrors = formatValidationErrors(result.errors);
        if (mode === 'strict') {
          return Promise.resolve({ error: { code: 422, message: `Validation failed:\n${formattedErrors}` }, id: reqId });
        } else {
          console.warn(`[Structura MCP] Validation warnings for injection:\n`, formattedErrors);
        }
      }

      const actionReqId = `structura_inject_schema-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      emit_sse(srv._clients, 'frontend-action-request', { action: 'structura_inject_schema', reqId: actionReqId, args: { dag: payload } });

      return new Promise<McpResponse>(resolve => {
        srv._pendingRequests.set(actionReqId, {
          resolve: () => resolve({ result: { success: true, validationWarnings: mode === 'passive' ? formattedErrors : undefined }, id: reqId }),
          reject: err => resolve({ error: { code: 500, message: err.message }, id: reqId })
        });
        setTimeout(() => {
          if (srv._pendingRequests.has(actionReqId)) {
            srv._pendingRequests.delete(actionReqId);
            resolve({ error: { code: 504, message: `Injection timeout` }, id: reqId });
          }
        }, 15000);
      });
    }
  );

  // 3. structura_load_workspace
  toolRegistry.registerTool(
    {
      name: 'structura_load_workspace',
      description: 'Load a complete WorkspaceState to restore UI session (zoom, pan, schemas, themes).',
      inputSchema: {
        type: 'object',
        properties: { payload: { type: 'object', description: 'The WorkspaceState JSON payload' } },
        required: ['payload']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const raw = (args.workspace || args.payload || args) as Record<string, unknown>;
      let newWorkspaceState: WorkspaceState;

      if (raw.canvases && typeof raw.canvases === 'object') {
        newWorkspaceState = raw as unknown as WorkspaceState;
      } else {
        const canvasId = (raw.active_canvas_id as string) || DEFAULT_CANVAS_ID;
        const schemaRecord: Record<string, SchemaModel> = {};

        if (Array.isArray(raw.schemas)) {
          raw.schemas.forEach((s: any) => {
            schemaRecord[s.id] = {
              id: s.id,
              name: s.name || s.id,
              entities: s.entities || [],
              links: s.links || []
            };
          });
        }

        const activeSchemaId = (raw.active_schema_id as string) || Object.keys(schemaRecord)[0] || DEFAULT_SCHEMA_ID;
        if (!schemaRecord[activeSchemaId]) {
          schemaRecord[activeSchemaId] = make_default_schema(activeSchemaId);
        }

        const canvas: CanvasModel = {
          id: canvasId,
          name: 'Canvas 1',
          schemas: schemaRecord,
          active_schema_id: activeSchemaId,
          viewport: (raw.viewport as any) || { pan: { x: 0, y: 0 }, zoom: 1 }
        };

        newWorkspaceState = {
          name: (raw.name as string) || 'Untitled Workspace',
          version: (raw.version as string) || '1',
          last_modified: new Date().toISOString(),
          settings: (raw.settings as Record<string, unknown>) || {},
          canvases: { [canvasId]: canvas },
          active_canvas_id: canvasId
        };
      }

      srv._state = { ...srv._state, workspace: newWorkspaceState };
      emit_sse(srv._clients, 'workspace', { type: 'state-loaded', state: srv._state });
      return { result: { success: true }, id: reqId };
    }
  );

  // 4. structura_get_workspace
  toolRegistry.registerTool(
    {
      name: 'structura_get_workspace',
      description: 'Get full workspace state including all canvases, schemas, and settings.',
      inputSchema: { type: 'object', properties: {} }
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => ({
      result: { workspace: srv._state.workspace },
      id: reqId
    })
  );

  // 5. structura_list_schemas
  toolRegistry.registerTool(
    {
      name: 'structura_list_schemas',
      description: 'List all schemas available in the active canvas.',
      inputSchema: { type: 'object', properties: {} }
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => {
      const canvas = get_active_canvas(srv._state);
      if (!canvas) return { result: { schemas: [], active_schema_id: '' }, id: reqId };
      const schemas = Object.values(canvas.schemas).map(s => ({
        id: s.id,
        name: s.name,
        entityCount: s.entities.length,
        linkCount: s.links.length,
        active: s.id === canvas.active_schema_id
      }));
      return { result: { schemas, active_schema_id: canvas.active_schema_id }, id: reqId };
    }
  );

  // 6. structura_create_schema
  toolRegistry.registerTool(
    {
      name: 'structura_create_schema',
      description: 'Create a new empty schema/tab in the active canvas.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['name']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const canvas = get_active_canvas(srv._state);
      if (
        srv._state.workspace.config?.allow_multiple_schemas === false &&
        canvas &&
        Object.keys(canvas.schemas).length >= 1
      ) return { error: { code: 403, message: 'Multi-schema disabled' }, id: reqId };
      const { id, name } = args as { id?: string; name: string };
      const schemaId = id ?? `schema-${Date.now()}`;
      if (canvas?.schemas[schemaId]) return { error: { code: 409, message: 'Schema id already exists' }, id: reqId };
      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          last_modified: new Date().toISOString(),
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: {
              ...canvas!,
              schemas: { ...canvas!.schemas, [schemaId]: make_default_schema(schemaId, name) },
              active_schema_id: schemaId
            }
          }
        }
      };
      emit_sse(srv._clients, 'workspace', { type: 'schema-created', id: schemaId, name });
      return { result: { success: true, id: schemaId, name }, id: reqId };
    }
  );

  // 7. structura_rename_schema
  toolRegistry.registerTool(
    {
      name: 'structura_rename_schema',
      description: 'Rename an existing schema/tab.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
        required: ['id', 'name']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const { id, name } = args as { id: string; name: string };
      const canvas = get_active_canvas(srv._state);
      if (!canvas?.schemas[id]) return { error: { code: 404, message: 'Schema not found' }, id: reqId };
      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: {
              ...canvas,
              schemas: { ...canvas.schemas, [id]: { ...canvas.schemas[id]!, name } }
            }
          }
        }
      };
      emit_sse(srv._clients, 'workspace', { type: 'schema-renamed', id, name });
      return { result: { success: true, id, name }, id: reqId };
    }
  );

  // 8. structura_delete_schema
  toolRegistry.registerTool(
    {
      name: 'structura_delete_schema',
      description: 'Delete a schema/tab.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const { id } = args as { id: string };
      const canvas = get_active_canvas(srv._state);
      if (!canvas?.schemas[id]) return { error: { code: 404, message: 'Schema not found' }, id: reqId };
      if (canvas.active_schema_id === id) return { error: { code: 400, message: 'Cannot delete active schema' }, id: reqId };

      const { [id]: _removed, ...remainingSchemas } = canvas.schemas;
      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, schemas: remainingSchemas }
          }
        }
      };
      emit_sse(srv._clients, 'workspace', { type: 'schema-deleted', id });
      return { result: { success: true, id }, id: reqId };
    }
  );

  // 9. structura_activate_schema
  toolRegistry.registerTool(
    {
      name: 'structura_activate_schema',
      description: 'Switch the active schema/tab in the UI.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const { id } = args as { id: string };
      const canvas = get_active_canvas(srv._state);
      if (!canvas?.schemas[id]) return { error: { code: 404, message: 'Schema not found' }, id: reqId };
      const canvasId = srv._state.workspace.active_canvas_id;
      srv._state = {
        ...srv._state,
        workspace: {
          ...srv._state.workspace,
          canvases: {
            ...srv._state.workspace.canvases,
            [canvasId]: { ...canvas, active_schema_id: id }
          }
        }
      };
      emit_sse(srv._clients, 'workspace', { type: 'schema-activated', id });
      return { result: { success: true, id }, id: reqId };
    }
  );

  // 10. structura_set_workspace_mode
  toolRegistry.registerTool(
    {
      name: 'structura_set_workspace_mode',
      description: 'Sets the operating mode of Atomos Structura (1: Single Canvas, 2: Multi-Canvas, 3: Meta Canvas).',
      inputSchema: {
        type: 'object',
        properties: { mode: { type: 'number', enum: [1, 2, 3] } },
        required: ['mode']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const mode = Number(args.mode) as 1 | 2 | 3;
      srv._state = {
        ...srv._state,
        workspace: { ...srv._state.workspace, mode }
      };
      emit_sse(srv._clients, 'workspace-mode-set', { mode });
      return { result: { success: true, mode }, id: reqId };
    }
  );

  // 11. structura_group_schema
  toolRegistry.registerTool(
    {
      name: 'structura_group_schema',
      description: 'Groups the current active schema into a reusable group.',
      inputSchema: {
        type: 'object',
        properties: { groupColor: { type: 'string' }, depends_on: { type: 'string' } }
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): Promise<McpResponse> => {
      const actionReqId = `structura_group_schema-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      emit_sse(srv._clients, 'frontend-action-request', { action: 'structura_group_schema', reqId: actionReqId, args });
      return new Promise<McpResponse>(resolve => {
        srv._pendingRequests.set(actionReqId, {
          resolve: res => resolve({ result: { success: true, ...(res as object) }, id: reqId }),
          reject: err => resolve({ error: { code: 500, message: err.message }, id: reqId })
        });
        setTimeout(() => {
          if (srv._pendingRequests.has(actionReqId)) {
            srv._pendingRequests.delete(actionReqId);
            resolve({ error: { code: 504, message: 'Tool execution timeout for structura_group_schema' }, id: reqId });
          }
        }, 15000);
      });
    }
  );
}
