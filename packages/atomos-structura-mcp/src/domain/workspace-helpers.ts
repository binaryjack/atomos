import type { ServerResponse } from 'http';
import type { CanvasModel, McpWorkspaceState, SchemaModel, WorkspaceConfig } from '../mcp.types.js';

export const DEFAULT_CANVAS_ID = 'canvas-default';
export const DEFAULT_SCHEMA_ID = 'schema-default';

export const make_default_schema = (id = DEFAULT_SCHEMA_ID, name = 'Default Schema'): SchemaModel => ({
  id, name, entities: [], links: []
});

export const make_default_canvas = (id = DEFAULT_CANVAS_ID, name = 'Canvas 1'): CanvasModel => ({
  id,
  name,
  schemas: { [DEFAULT_SCHEMA_ID]: make_default_schema() },
  active_schema_id: DEFAULT_SCHEMA_ID,
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 }
});

export const make_initial_state = (cfg?: WorkspaceConfig): McpWorkspaceState => ({
  workspace: {
    name: 'Untitled Workspace',
    version: '1',
    last_modified: new Date().toISOString(),
    ...(cfg ? { config: cfg } : {}),
    canvases: { [DEFAULT_CANVAS_ID]: make_default_canvas() },
    active_canvas_id: DEFAULT_CANVAS_ID,
    allowed_root_paths: []
  }
});

export const get_active_canvas = (state: McpWorkspaceState): CanvasModel | undefined =>
  state.workspace.canvases[state.workspace.active_canvas_id];

export const get_active_schema = (state: McpWorkspaceState): SchemaModel | undefined => {
  const canvas = get_active_canvas(state);
  return canvas ? canvas.schemas[canvas.active_schema_id] : undefined;
};

export const find_canvas_for_schema = (state: McpWorkspaceState, schema_id: string): CanvasModel | undefined =>
  Object.values(state.workspace.canvases).find(c => schema_id in c.schemas);

export const update_schema_by_id = (
  state: McpWorkspaceState,
  schema_id: string,
  fn: (schema: SchemaModel) => SchemaModel
): McpWorkspaceState => {
  const canvas = find_canvas_for_schema(state, schema_id);
  if (!canvas) return state;
  const schema = canvas.schemas[schema_id];
  if (!schema) return state;
  return {
    ...state,
    workspace: {
      ...state.workspace,
      last_modified: new Date().toISOString(),
      canvases: {
        ...state.workspace.canvases,
        [canvas.id]: {
          ...canvas,
          schemas: { ...canvas.schemas, [schema_id]: fn(schema) }
        }
      }
    }
  };
};

export const emit_sse = (clients: Set<ServerResponse>, event: string, data: unknown): void => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  });
};
