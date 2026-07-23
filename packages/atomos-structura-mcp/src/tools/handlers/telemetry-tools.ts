import { dagExchangeSchema } from '@atomos-web/structura-core';
import { emit_sse, find_canvas_for_schema, update_schema_by_id } from '../../domain/workspace-helpers.js';
import { mcpWorkspaceStateSchema, schemaModelSchema, telemetrySchema, type McpResponse, type VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export function registerTelemetryTools(): void {
  // 1. structura_discovery
  toolRegistry.registerTool(
    {
      name: 'structura_discovery',
      description: 'Discover all available Structura enums, formats, templates, and configurations.',
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: "Optional. 'telemetry', 'formats', 'enums', 'layouts', or omit for all." }
        }
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse | Promise<McpResponse> => {
      const topic = (args.topic as string) || 'all';

      const getFormats = () => ({
        Telemetry: { description: 'JSON Schema for telemetry payloads.', schema: telemetrySchema.toJSONSchema() },
        DAGExchange: { description: 'JSON Schema for headless DAG building/import/export. Used by structura_inject_schema.', schema: dagExchangeSchema.toJSONSchema() },
        SchemaModel: { description: 'JSON Schema for strict Structura layout and properties.', schema: schemaModelSchema.toJSONSchema() },
        WorkspaceState: { description: 'JSON Schema for complete workspace persistence/restoration. Used by structura_load_workspace.', schema: mcpWorkspaceStateSchema.toJSONSchema() }
      });

      const getTelemetry = () => ({
        description: 'Available states and effects for telemetry reporting.',
        states: ['not_started', 'in_progress', 'info', 'warning', 'error', 'success', 'cancelled', 'escalation', 'skipped', 'paused'],
        effects: ['none', 'glow', 'pulse', 'blink', 'shake'],
        link_directions: ['source-to-target', 'target-to-source']
      });

      const getEnums = () => ({
        description: 'Core enumerations used throughout Structura.',
        data_types: ['string', 'number', 'integer', 'float', 'boolean', 'date', 'uuid', 'json', 'array', 'object'],
        component_types: ['input', 'select', 'checkbox', 'textarea'],
        cardinalities: ['1', '*', '0..1', '1..*']
      });

      if (topic === 'layouts' || topic === 'all') {
        const actionReqId = `structura_get_layouts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        emit_sse(srv._clients, 'frontend-action-request', { action: 'structura_get_layouts', reqId: actionReqId, args: {} });

        return new Promise<McpResponse>(resolve => {
          srv._pendingRequests.set(actionReqId, {
            resolve: result => {
              const resObj = result as { layouts?: string[] };
              const layouts = resObj?.layouts || [];
              const layoutObj = { description: 'Available layout templates/strategies.', layouts };
              if (topic === 'layouts') resolve({ result: layoutObj, id: reqId });
              else resolve({ result: { formats: getFormats(), telemetry: getTelemetry(), enums: getEnums(), layouts: layoutObj }, id: reqId });
            },
            reject: err => resolve({ error: { code: 500, message: err.message }, id: reqId })
          });

          setTimeout(() => {
            if (srv._pendingRequests.has(actionReqId)) {
              srv._pendingRequests.delete(actionReqId);
              const fallbackLayouts = { description: 'Available layout templates/strategies.', layouts: ['sugiyama', 'clear'] };
              if (topic === 'layouts') resolve({ result: fallbackLayouts, id: reqId });
              else resolve({ result: { formats: getFormats(), telemetry: getTelemetry(), enums: getEnums(), layouts: fallbackLayouts }, id: reqId });
            }
          }, 5000);
        });
      }

      if (topic === 'formats') return { result: getFormats(), id: reqId };
      if (topic === 'telemetry') return { result: getTelemetry(), id: reqId };
      if (topic === 'enums') return { result: getEnums(), id: reqId };

      return { result: { formats: getFormats(), telemetry: getTelemetry(), enums: getEnums() }, id: reqId };
    }
  );

  // 2. structura_report_progress
  toolRegistry.registerTool(
    {
      name: 'structura_report_progress',
      description: 'Report telemetry progress for entities and links.',
      inputSchema: {
        type: 'object',
        properties: { payload: { type: 'object' } },
        required: ['payload']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const payload = (args.payload || args) as { schema_id?: string; node_id?: string; status?: string; log_stream?: string };
      const schema_id = payload.schema_id;
      const node_id = payload.node_id;
      const status = payload.status;
      const log_stream = payload.log_stream || '';

      if (schema_id && node_id) {
        srv._state = update_schema_by_id(srv._state, schema_id, s => ({
          ...s,
          entities: s.entities.map(e => {
            if (e.id === node_id) {
              const dynEntity = e as unknown as { props?: Record<string, unknown> };
              const prevProps = dynEntity.props || {};
              const prevLog = (prevProps.log_stream as string) || '';
              return {
                ...e,
                props: { ...prevProps, status, log_stream: prevLog + log_stream }
              } as unknown as typeof e;
            }
            return e;
          })
        }));

        const canvas = find_canvas_for_schema(srv._state, schema_id);
        const schema = canvas?.schemas[schema_id];
        const updatedEntity = schema?.entities.find(e => e.id === node_id) as unknown as { props?: Record<string, unknown> };

        srv.broadcast_event('node-progress', {
          schema_id,
          node_id,
          status,
          log_stream: updatedEntity?.props?.log_stream || ''
        });
      }

      return { result: { success: true }, id: reqId };
    }
  );

  // 3. structura_get_settings
  toolRegistry.registerTool(
    {
      name: 'structura_get_settings',
      description: 'Retrieve global workspace settings.',
      inputSchema: { type: 'object', properties: {} }
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => ({
      result: { settings: srv._state.workspace.settings ?? {} },
      id: reqId
    })
  );

  // 4. structura_update_settings
  toolRegistry.registerTool(
    {
      name: 'structura_update_settings',
      description: 'Update global workspace settings.',
      inputSchema: {
        type: 'object',
        properties: { settings: { type: 'object' } },
        required: ['settings']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const { settings } = args as { settings: Record<string, unknown> };
      const merged = { ...(srv._state.workspace.settings ?? {}), ...settings };
      srv._state = {
        ...srv._state,
        workspace: { ...srv._state.workspace, settings: merged, last_modified: new Date().toISOString() }
      };
      emit_sse(srv._clients, 'workspace', { type: 'settings-updated', settings: merged });
      return { result: { success: true, settings: merged }, id: reqId };
    }
  );

  // 5. Proxy Actions: export_svg, export_png, export_dag, auto_layout, optimize_connections, undo, redo
  const proxyActions = [
    'structura_export_svg',
    'structura_export_png',
    'structura_export_dag',
    'structura_auto_layout',
    'structura_optimize_connections',
    'structura_undo',
    'structura_redo'
  ];

  proxyActions.forEach(actionName => {
    toolRegistry.registerTool(
      {
        name: actionName,
        description: `Execute ${actionName} operation on active canvas.`,
        inputSchema: { type: 'object', properties: {} }
      },
      (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): Promise<McpResponse> => {
        const actionReqId = `${actionName}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        emit_sse(srv._clients, 'frontend-action-request', { action: actionName, reqId: actionReqId, args });

        return new Promise<McpResponse>(resolve => {
          srv._pendingRequests.set(actionReqId, {
            resolve: result => resolve({ result: { success: true, ...(result as object) }, id: reqId }),
            reject: err => resolve({ error: { code: 500, message: err.message }, id: reqId })
          });

          setTimeout(() => {
            if (srv._pendingRequests.has(actionReqId)) {
              srv._pendingRequests.delete(actionReqId);
              resolve({ error: { code: 504, message: `Tool execution timeout for ${actionName}` }, id: reqId });
            }
          }, 15000);
        });
      }
    );
  });
}
