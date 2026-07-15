import { dagExchangeSchema, universalSchema, entitySchema, linkSchema, type Entity, type LinkProps, type WorkspaceConfig, type WorkspaceMenuConfig } from '@atomos-web/structura-core';
import { f } from '@binaryjack/formular.dev';
import chokidar, { type FSWatcher } from 'chokidar';
import dagre from 'dagre';
import fs from 'fs';
import type { IncomingMessage, ServerResponse } from 'http';

// Local mirror of Redux state shape (avoids circular dep on @atomos-web/structura)

interface SchemaModel {
  readonly id: string;
  readonly name: string;
  entities: Entity[];
  links: LinkProps[];
}

interface CanvasModel {
  readonly id: string;
  readonly name: string;
  schemas: Record<string, SchemaModel>;
  active_schema_id: string;
  viewport: { pan: { x: number; y: number }; zoom: number };
  readonly appearance_override?: Record<string, unknown>;
}

interface WorkspaceState {
  readonly name: string;
  readonly version: string;
  last_modified: string;
  settings?: Record<string, unknown>;
  config?: WorkspaceConfig;
  canvases: Record<string, CanvasModel>;
  active_canvas_id: string;
  allowed_root_paths?: string[];
}

/** Full workspace state mirroring Redux shape -- round-trippable with the browser store. */
export interface McpWorkspaceState {
  workspace: WorkspaceState;
  is_settings_open?: boolean;
  /** Resolved menu config, updated via sync-state from the browser. */
  menu_config?: WorkspaceMenuConfig;
  /** Resolved toolbox config, updated via sync-state or tools. */
  toolbox_config?: any; // ToolboxConfiguration from @atomos-web/prime
}

// Public request/response types

export const schemaModelSchema = f.object({
  id: f.string().nonempty(),
  name: f.string().nonempty(),
  entities: f.array(entitySchema as any),
  links: f.array(linkSchema as any)
});

export const canvasModelSchema = f.object({
  id: f.string().nonempty(),
  name: f.string().nonempty(),
  schemas: f.record(f.string(), schemaModelSchema),
  active_schema_id: f.string().nonempty(),
  viewport: f.object({ pan: f.object({ x: f.number(), y: f.number() }), zoom: f.number() }),
  appearance_override: f.record(f.string(), f.string()).optional()
});

export const workspaceStateSchema = f.object({
  name: f.string().nonempty(),
  version: f.string().nonempty(),
  last_modified: f.string().nonempty(),
  settings: f.record(f.string(), f.string()).optional(),
  config: f.object({}).optional(),
  canvases: f.record(f.string(), canvasModelSchema),
  active_canvas_id: f.string().nonempty(),
  allowed_root_paths: f.array(f.string()).optional()
});

export const mcpWorkspaceStateSchema = f.object({
  workspace: workspaceStateSchema,
  is_settings_open: f.boolean().optional(),
  menu_config: f.object({}).optional(),
  toolbox_config: f.object({}).optional()
});

export const telemetrySchema = f.object({
  entities: f.array(f.object({
    id: f.string().nonempty(),
    state: f.string().nonempty(),
    color: f.string().optional(),
    effect: f.string().optional()
  })).optional(),
  links: f.array(f.object({
    id: f.string().nonempty(),
    direction: f.string().nonempty()
  })).optional()
});

export interface McpRequest {
  readonly method: string;
  readonly params: unknown;
  readonly id: string;
}

export interface McpResponse {
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
  readonly id: string;
}

/** Payload emitted via the `change` SSE event. */
export interface McpChangePayload {
  readonly schema_id: string;
  readonly entities: Entity[];
  readonly links: LinkProps[];
}

type McpWorkspaceEventType =
  | 'settings-updated'
  | 'schema-created'
  | 'schema-renamed'
  | 'schema-deleted'
  | 'schema-activated'
  | 'state-loaded'
  | 'canvas-created'
  | 'canvas-renamed'
  | 'canvas-deleted'
  | 'canvas-activated';

/** Payload emitted via the `workspace` SSE event. */
export interface McpWorkspacePayload {
  readonly type: McpWorkspaceEventType;
  readonly settings?: Record<string, unknown>;
  readonly id?: string;
  readonly name?: string;
  readonly state?: McpWorkspaceState;
}

export interface McpServerConfig {
  readonly initialConfig?: WorkspaceConfig;
  /** Called when the MCP `session/close` tool is invoked. */
  readonly onSessionClose?: () => void;
  /** Called when the MCP `session/clear-memory` tool is invoked. */
  readonly onClearMemory?: () => void;
}

// Default-state helpers

const DEFAULT_CANVAS_ID = 'canvas-default';
const DEFAULT_SCHEMA_ID = 'schema-default';

const make_default_schema = (id = DEFAULT_SCHEMA_ID, name = 'Default Schema'): SchemaModel => ({
  id, name, entities: [], links: [],
});

const make_default_canvas = (id = DEFAULT_CANVAS_ID, name = 'Canvas 1'): CanvasModel => ({
  id,
  name,
  schemas: { [DEFAULT_SCHEMA_ID]: make_default_schema() },
  active_schema_id: DEFAULT_SCHEMA_ID,
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
});

const make_initial_state = (cfg?: WorkspaceConfig): McpWorkspaceState => ({
  workspace: {
    name: 'Untitled Workspace',
    version: '1',
    last_modified: new Date().toISOString(),
    ...(cfg ? { config: cfg } : {}),
    canvases: { [DEFAULT_CANVAS_ID]: make_default_canvas() },
    active_canvas_id: DEFAULT_CANVAS_ID,
    allowed_root_paths: [],
  },
});

// Internal state accessors

const get_active_canvas = (state: McpWorkspaceState): CanvasModel | undefined =>
  state.workspace.canvases[state.workspace.active_canvas_id];

const get_active_schema = (state: McpWorkspaceState): SchemaModel | undefined => {
  const canvas = get_active_canvas(state);
  return canvas ? canvas.schemas[canvas.active_schema_id] : undefined;
};

/** Locate the canvas that owns the given schema ID (searches all canvases). */
const find_canvas_for_schema = (state: McpWorkspaceState, schema_id: string): CanvasModel | undefined =>
  Object.values(state.workspace.canvases).find(c => schema_id in c.schemas);

/** Immutably update a specific schema by ID, locating it across all canvases. */
const update_schema_by_id = (
  state: McpWorkspaceState,
  schema_id: string,
  fn: (schema: SchemaModel) => SchemaModel,
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
          schemas: { ...canvas.schemas, [schema_id]: fn(schema) },
        },
      },
    },
  };
};

const emit_sse = (clients: Set<ServerResponse>, event: string, data: unknown): void => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { res.write(payload); } catch { clients.delete(res); }
  });
};

// Prototype constructor

interface VbsMcpServerInstance {
  _state: McpWorkspaceState;
  _clients: Set<ServerResponse>;
  _cfg: McpServerConfig;
  _watcher?: FSWatcher;
  _pendingRequests: Map<string, { resolve: (result: any) => void; reject: (err: Error) => void }>;
  broadcast_event(event: string, data: unknown): void;
}

export interface VbsMcpServer {
  handleSSE(req: IncomingMessage, res: ServerResponse): void;
  handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
  broadcast_event(event: string, data: unknown): void;
}

export function VbsMcpServer(this: VbsMcpServerInstance, cfg?: McpServerConfig): void {
  Object.defineProperty(this, '_state', {
    enumerable: false,
    writable: true,
    value: make_initial_state(cfg?.initialConfig),
  });
  Object.defineProperty(this, '_clients', {
    enumerable: false,
    writable: true,
    value: new Set<ServerResponse>(),
  });
  Object.defineProperty(this, '_cfg', {
    enumerable: false,
    writable: false,
    value: cfg ?? {},
  });
  Object.defineProperty(this, '_watcher', {
    enumerable: false,
    writable: true,
    value: undefined,
  });
  Object.defineProperty(this, '_pendingRequests', {
    enumerable: false,
    writable: true,
    value: new Map<string, { resolve: (result: any) => void; reject: (err: Error) => void }>(),
  });
}

// SSE handler

VbsMcpServer.prototype.broadcast_event = function(
  this: VbsMcpServerInstance,
  event: string,
  data: unknown,
): void {
  emit_sse(this._clients, event, data);
};

VbsMcpServer.prototype.handleSSE = function(
  this: VbsMcpServerInstance,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.writeHead(200);
  res.write(':ok\n\n');
  this._clients.add(res);
  req.on('close', () => this._clients.delete(res));
};

// HTTP handler

VbsMcpServer.prototype.handleRequest = async function(
  this: VbsMcpServerInstance,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(405);
      res.end(JSON.stringify({ error: { code: 405, message: 'Method not allowed' }, id: '' }));
      return;
    }
    const body = await read_body(req);
    const request = JSON.parse(body) as McpRequest;
    const response = await process_request(this, request);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(response));
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(500);
    res.end(JSON.stringify({
      error: { code: 500, message: error instanceof Error ? error.message : 'Internal error' },
      id: '',
    }));
  }
};

// Request router

const process_request = async (srv: VbsMcpServerInstance, req: McpRequest): Promise<McpResponse> => {
  switch (req.method) {
    case 'atomos-structura/initialize-workspace': return handle_initialize_workspace(srv, req);
    case 'atomos-structura/create-entity':   return handle_create_entity(srv, req);
    case 'atomos-structura/get-entity':      return handle_get_entity(srv, req);
    case 'atomos-structura/update-entity':   return handle_update_entity(srv, req);
    case 'atomos-structura/delete-entity':   return handle_delete_entity(srv, req);
    case 'atomos-structura/create-link':     return handle_create_link(srv, req);
    case 'atomos-structura/get-schema':      return handle_get_schema(srv, req);
    case 'atomos-structura/sync-state':      return handle_sync_state(srv, req);
    case 'atomos-structura/get-settings':    return handle_get_settings(srv, req);
    case 'atomos-structura/update-settings': return handle_update_settings(srv, req);
    case 'atomos-structura/list-schemas':    return handle_list_schemas(srv, req);
    case 'atomos-structura/create-schema':   return handle_create_schema(srv, req);
    case 'atomos-structura/rename-schema':   return handle_rename_schema(srv, req);
    case 'atomos-structura/delete-schema':   return handle_delete_schema(srv, req);
    case 'atomos-structura/activate-schema': return handle_activate_schema(srv, req);
    case 'atomos-structura/get-workspace':   return handle_get_workspace(srv, req);

    case 'atomos-structura/report-progress': return handle_report_progress(srv, req);
    case 'atomos-structura/viewport/get':       return handle_viewport_get(srv, req);
    case 'atomos-structura/viewport/set-zoom':  return handle_viewport_set_zoom(srv, req);
    case 'atomos-structura/viewport/set-pan':   return handle_viewport_set_pan(srv, req);
    case 'atomos-structura/viewport/center':    return handle_viewport_center(srv, req);
    case 'atomos-structura/viewport/fit-to-screen': return handle_viewport_fit(srv, req);
    case 'atomos-structura/session/close':        return handle_session_close(srv, req);
    case 'atomos-structura/session/clear-memory': return handle_session_clear_memory(srv, req);
    case 'tools/list': return handle_tools_list(srv, req);
    case 'tools/call': return handle_tools_call(srv, req);
    case 'atomos-structura/tool-result': return handle_tool_result(srv, req);
    default: return { error: { code: -32601, message: 'Method not found' }, id: req.id };
  }
};

const handle_tool_result = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { reqId, result, error } = req.params as { reqId: string; result?: any; error?: string };
  const pending = srv._pendingRequests.get(reqId);
  if (pending) {
    if (error) pending.reject(new Error(error));
    else pending.resolve(result);
    srv._pendingRequests.delete(reqId);
  }
  return { result: { success: true }, id: req.id };
};

// Entity handlers

const handle_create_entity = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const params = req.params as { schema_id?: string } & Entity;
  const active_schema = get_active_schema(srv._state);
  const schema_id = params.schema_id || active_schema?.id;
  const { schema_id: _ignore, ...entity } = params;
  if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: req.id };
  if (!find_canvas_for_schema(srv._state, schema_id)) return { error: { code: 404, message: 'Schema not found' }, id: req.id };
  srv._state = update_schema_by_id(srv._state, schema_id, s => ({
    ...s, entities: [...s.entities.filter(e => e.id !== entity.id), entity as Entity],
  }));
  const canvas = find_canvas_for_schema(srv._state, schema_id);
  const schema = canvas?.schemas[schema_id];
  emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });
  return { result: { success: true, entity }, id: req.id };
};

const handle_get_entity = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { schema_id, entityId } = req.params as { schema_id?: string; entityId: string };
  const schema = schema_id
    ? find_canvas_for_schema(srv._state, schema_id)?.schemas[schema_id]
    : get_active_schema(srv._state);
  const entity = schema?.entities.find(e => e.id === entityId);
  if (!entity) return { error: { code: 404, message: 'Entity not found' }, id: req.id };
  return { result: { entity }, id: req.id };
};

const handle_update_entity = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const params = req.params as { schema_id?: string } & Entity;
  const active_schema = get_active_schema(srv._state);
  const schema_id = params.schema_id || active_schema?.id;
  const { schema_id: _ignore, ...entity } = params;
  if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: req.id };
  const canvas = find_canvas_for_schema(srv._state, schema_id);
  const schema = canvas?.schemas[schema_id];
  if (!schema?.entities.some(e => e.id === (entity as Entity).id))
    return { error: { code: 404, message: 'Entity not found' }, id: req.id };
  srv._state = update_schema_by_id(srv._state, schema_id, s => ({
    ...s, entities: s.entities.map(e => e.id === (entity as Entity).id ? entity as Entity : e),
  }));
  const updatedCanvas = find_canvas_for_schema(srv._state, schema_id);
  const updated = updatedCanvas?.schemas[schema_id];
  emit_sse(srv._clients, 'change', { schema_id, entities: updated?.entities ?? [], links: updated?.links ?? [] });
  return { result: { success: true, entity }, id: req.id };
};

const handle_report_progress = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { schema_id, node_id, status, log_stream } = req.params as {
    schema_id: string;
    node_id: string;
    status: string;
    log_stream: string;
  };

  // Mise à jour de l'état mémoire
  srv._state = update_schema_by_id(srv._state, schema_id, s => ({
    ...s,
    entities: s.entities.map((e: any) => e.id === node_id ? {
      ...e,
      props: { ...e.props, status, log_stream: (e.props.log_stream || "") + log_stream }
    } : e)
  }));

  // Extraction de la chaîne accumulée pour diffusion SSE complète
  const canvas = find_canvas_for_schema(srv._state, schema_id);
  const schema = canvas?.schemas[schema_id];
  const updatedEntity = schema?.entities.find(e => e.id === node_id) as any;

  // Diffusion SSE immédiate vers le Canvas (Snapshot complet pour éviter les désynchronisations de deltas)
  srv.broadcast_event('node-progress', { 
    schema_id, 
    node_id, 
    status, 
    log_stream: updatedEntity?.props.log_stream || "" 
  });

  return { result: { success: true }, id: req.id };
};

const handle_delete_entity = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const params = req.params as { schema_id?: string; entityId: string };
  const active_schema = get_active_schema(srv._state);
  const schema_id = params.schema_id || active_schema?.id;
  const entityId = params.entityId;
  if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: req.id };
  const canvas = find_canvas_for_schema(srv._state, schema_id);
  const schema = canvas?.schemas[schema_id];
  if (!schema?.entities.some(e => e.id === entityId))
    return { error: { code: 404, message: 'Entity not found' }, id: req.id };
  srv._state = update_schema_by_id(srv._state, schema_id, s => ({
    ...s,
    entities: s.entities.filter(e => e.id !== entityId),
    links: s.links.filter(l => l.leftEntityId !== entityId && l.rightEntityId !== entityId),
  }));
  const updatedCanvas = find_canvas_for_schema(srv._state, schema_id);
  const updated = updatedCanvas?.schemas[schema_id];
  emit_sse(srv._clients, 'change', { schema_id, entities: updated?.entities ?? [], links: updated?.links ?? [] });
  return { result: { success: true }, id: req.id };
};

const handle_create_link = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const params = req.params as { schema_id?: string } & LinkProps;
  const active_schema = get_active_schema(srv._state);
  const schema_id = params.schema_id || active_schema?.id;
  const { schema_id: _ignore, ...link } = params;
  if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: req.id };
  if (!find_canvas_for_schema(srv._state, schema_id)) return { error: { code: 404, message: 'Schema not found' }, id: req.id };
  srv._state = update_schema_by_id(srv._state, schema_id, s => ({
    ...s, links: [...s.links.filter(l => l.id !== (link as LinkProps).id), link as LinkProps],
  }));
  const canvas = find_canvas_for_schema(srv._state, schema_id);
  const schema = canvas?.schemas[schema_id];
  emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });
  return { result: { success: true, link }, id: req.id };
};

const handle_get_schema = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { schemaId } = ((req.params ?? {}) as { schemaId?: string });
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
  if (schemaId && schemaId !== canvas.active_schema_id) {
    const schema = canvas.schemas[schemaId];
    if (!schema) return { error: { code: 404, message: 'Schema not found' }, id: req.id };
    return { result: { schema: { ...schema, metadata: { version: '1.0.0' } } }, id: req.id };
  }
  const schema = get_active_schema(srv._state);
  return { result: { schema: { ...schema, metadata: { createdAt: Date.now(), version: '1.0.0' } } }, id: req.id };
};

const handle_sync_state = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { schema_id, entities = [], links = [], settings, menu_config, toolbox_config } = req.params as {
    schema_id?: string;
    entities?: Entity[];
    links?: LinkProps[];
    settings?: Record<string, unknown>;
    menu_config?: WorkspaceMenuConfig;
    toolbox_config?: any;
  };
  if (schema_id && find_canvas_for_schema(srv._state, schema_id)) {
    srv._state = update_schema_by_id(srv._state, schema_id, s => ({ ...s, entities: [...entities], links: [...links] }));
  } else {
    // Fallback: sync into the active schema (browser always knows its active schema)
    const activeCanvas = get_active_canvas(srv._state);
    if (activeCanvas) {
      const activeSchemaId = activeCanvas.active_schema_id;
      srv._state = update_schema_by_id(srv._state, activeSchemaId, s => ({ ...s, entities: [...entities], links: [...links] }));
    }
  }
  if (settings !== undefined) {
    srv._state = {
      ...srv._state,
      workspace: { ...srv._state.workspace, settings, last_modified: new Date().toISOString() },
    };
  }
  if (menu_config !== undefined) {
    srv._state = { ...srv._state, menu_config };
    emit_sse(srv._clients, 'menu-config', menu_config);
  }
  if (toolbox_config !== undefined) {
    srv._state = { ...srv._state, toolbox_config };
    emit_sse(srv._clients, 'toolbox-config', toolbox_config);
  }
  // sync-state originates from the browser -- do NOT emit SSE to avoid a feedback loop
  return { result: { success: true }, id: req.id };
};

// Settings handlers

const handle_get_settings = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse =>
  ({ result: { settings: srv._state.workspace.settings ?? {} }, id: req.id });

const handle_update_settings = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { settings } = req.params as { settings: Record<string, unknown> };
  const merged = { ...(srv._state.workspace.settings ?? {}), ...settings };
  srv._state = {
    ...srv._state,
    workspace: { ...srv._state.workspace, settings: merged, last_modified: new Date().toISOString() },
  };
  emit_sse(srv._clients, 'workspace', { type: 'settings-updated', settings: merged });
  return { result: { success: true, settings: merged }, id: req.id };
};

// Schema handlers

const handle_list_schemas = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { result: { schemas: [], active_schema_id: '' }, id: req.id };
  const schemas = Object.values(canvas.schemas).map(s => ({
    id: s.id,
    name: s.name,
    entityCount: s.entities.length,
    linkCount: s.links.length,
    active: s.id === canvas.active_schema_id,
  }));
  return { result: { schemas, active_schema_id: canvas.active_schema_id }, id: req.id };
};

const handle_create_schema = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const canvas = get_active_canvas(srv._state);
  if (
    srv._state.workspace.config?.allow_multiple_schemas === false &&
    canvas &&
    Object.keys(canvas.schemas).length >= 1
  ) return { error: { code: 403, message: 'Multi-schema disabled' }, id: req.id };
  const { id, name } = req.params as { id?: string; name: string };
  const schemaId = id ?? `schema-${Date.now()}`;
  if (canvas?.schemas[schemaId]) return { error: { code: 409, message: 'Schema id already exists' }, id: req.id };
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
          active_schema_id: schemaId,
        },
      },
    },
  };
  emit_sse(srv._clients, 'workspace', { type: 'schema-created', id: schemaId, name });
  return { result: { success: true, id: schemaId, name }, id: req.id };
};

const handle_rename_schema = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { id, name } = req.params as { id: string; name: string };
  const canvas = get_active_canvas(srv._state);
  if (!canvas?.schemas[id]) return { error: { code: 404, message: 'Schema not found' }, id: req.id };
  const canvasId = srv._state.workspace.active_canvas_id;
  srv._state = {
    ...srv._state,
    workspace: {
      ...srv._state.workspace,
      last_modified: new Date().toISOString(),
      canvases: {
        ...srv._state.workspace.canvases,
        [canvasId]: {
          ...canvas,
          schemas: { ...canvas.schemas, [id]: { ...canvas.schemas[id]!, name } },
        },
      },
    },
  };
  emit_sse(srv._clients, 'workspace', { type: 'schema-renamed', id, name });
  return { result: { success: true }, id: req.id };
};

const handle_delete_schema = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { id } = req.params as { id: string };
  const canvas = get_active_canvas(srv._state);
  if (!canvas?.schemas[id]) return { error: { code: 404, message: 'Schema not found' }, id: req.id };
  if (id === canvas.active_schema_id)
    return { error: { code: 400, message: 'Cannot delete the active schema' }, id: req.id };
  const { [id]: _removed, ...remaining } = canvas.schemas;
  const canvasId = srv._state.workspace.active_canvas_id;
  srv._state = {
    ...srv._state,
    workspace: {
      ...srv._state.workspace,
      last_modified: new Date().toISOString(),
      canvases: {
        ...srv._state.workspace.canvases,
        [canvasId]: { ...canvas, schemas: remaining },
      },
    },
  };
  emit_sse(srv._clients, 'workspace', { type: 'schema-deleted', id });
  return { result: { success: true }, id: req.id };
};

const handle_activate_schema = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { id } = req.params as { id: string };
  const canvas = get_active_canvas(srv._state);
  if (!canvas?.schemas[id]) return { error: { code: 404, message: 'Schema not found' }, id: req.id };
  const canvasId = srv._state.workspace.active_canvas_id;
  srv._state = {
    ...srv._state,
    workspace: {
      ...srv._state.workspace,
      canvases: {
        ...srv._state.workspace.canvases,
        [canvasId]: { ...canvas, active_schema_id: id },
      },
    },
  };
  emit_sse(srv._clients, 'workspace', { type: 'schema-activated', id });
  return { result: { success: true, id }, id: req.id };
};

// Workspace initialization handlers

const handle_initialize_workspace = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { rootPaths } = req.params as { rootPaths: string[] };
  srv._state = {
    ...srv._state,
    workspace: {
      ...srv._state.workspace,
      allowed_root_paths: rootPaths || [],
    },
  };
  console.log(`[MCP Server] Multi-root indexation activée pour :`, srv._state.workspace.allowed_root_paths);
  return { result: { success: true }, id: req.id };
};

// Workspace persistence handlers

const handle_get_workspace = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => ({
  result: { workspace: srv._state },
  id: req.id,
});



// HTTP utility

const read_body = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

// Viewport handlers

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

const handle_viewport_get = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
  return { result: { viewport: canvas.viewport }, id: req.id };
};

const handle_viewport_set_zoom = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  if (srv._state.workspace.config?.menu?.zoom?.available === false)
    return { error: { code: 403, message: 'Feature not available' }, id: req.id };
  const { level } = req.params as { level: number };
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
  const canvasId = srv._state.workspace.active_canvas_id;
  srv._state = {
    ...srv._state,
    workspace: {
      ...srv._state.workspace,
      canvases: {
        ...srv._state.workspace.canvases,
        [canvasId]: { ...canvas, viewport: { ...canvas.viewport, zoom: clamped } },
      },
    },
  };
  emit_sse(srv._clients, 'viewport-updated', { viewport: srv._state.workspace.canvases[canvasId]!.viewport });
  return { result: { success: true, zoom: clamped }, id: req.id };
};

const handle_viewport_set_pan = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { x, y } = req.params as { x: number; y: number };
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
  const canvasId = srv._state.workspace.active_canvas_id;
  srv._state = {
    ...srv._state,
    workspace: {
      ...srv._state.workspace,
      canvases: {
        ...srv._state.workspace.canvases,
        [canvasId]: { ...canvas, viewport: { ...canvas.viewport, pan: { x, y } } },
      },
    },
  };
  emit_sse(srv._clients, 'viewport-updated', { viewport: srv._state.workspace.canvases[canvasId]!.viewport });
  return { result: { success: true, pan: { x, y } }, id: req.id };
};

const handle_viewport_center = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  if (srv._state.workspace.config?.menu?.center_on_screen?.available === false)
    return { error: { code: 403, message: 'Feature not available' }, id: req.id };
  const { width = 800, height = 600 } = (req.params ?? {}) as { width?: number; height?: number };
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
  const schema = canvas.schemas[canvas.active_schema_id];
  if (!schema || schema.entities.length === 0)
    return { result: { success: true, skipped: true }, id: req.id };
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
        [canvasId]: { ...canvas, viewport: { zoom, pan } },
      },
    },
  };
  emit_sse(srv._clients, 'viewport-updated', { viewport: { zoom, pan } });
  return { result: { success: true, viewport: { zoom, pan } }, id: req.id };
};

const handle_viewport_fit = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  if (srv._state.workspace.config?.menu?.fit_to_screen?.available === false)
    return { error: { code: 403, message: 'Feature not available' }, id: req.id };
  const { width = 800, height = 600, padding = 100 } =
    (req.params ?? {}) as { width?: number; height?: number; padding?: number };
  const canvas = get_active_canvas(srv._state);
  if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
  const schema = canvas.schemas[canvas.active_schema_id];
  if (!schema || schema.entities.length === 0)
    return { result: { success: true, skipped: true }, id: req.id };
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
    2,
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
        [canvasId]: { ...canvas, viewport: { zoom, pan } },
      },
    },
  };
  emit_sse(srv._clients, 'viewport-updated', { viewport: { zoom, pan } });
  return { result: { success: true, viewport: { zoom, pan } }, id: req.id };
};

// Session handlers

const handle_session_close = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  srv._cfg.onSessionClose?.();
  srv._clients.forEach(r => { try { r.end(); } catch { /* ignore */ } });
  srv._clients.clear();
  return { result: { success: true }, id: req.id };
};

const handle_session_clear_memory = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  srv._cfg.onClearMemory?.();
  const runtimeConfig = srv._state.workspace.config;
  srv._state = runtimeConfig
    ? { ...make_initial_state(runtimeConfig) }
    : make_initial_state();
  emit_sse(srv._clients, 'state-reset', { success: true });
  return { result: { success: true }, id: req.id };
};

// Standard MCP Tools handlers

const handle_tools_list = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  return {
    id: req.id,
    result: {
      tools: [
        {
          name: "structura_get_schema",
          description: "Retrieve the current state of a schema on the Erathos canvas.",
          inputSchema: {
            type: "object",
            properties: { schema_id: { type: "string" } },
            required: ["schema_id"]
          }
        },
        {
          name: "structura_get_toolbox_config",
          description: "Retrieve the current toolbox configuration from the Erathos canvas.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_set_toolbox_config",
          description: "Set the toolbox configuration for the Erathos canvas.",
          inputSchema: {
            type: "object",
            properties: { config: { type: "object" } },
            required: ["config"]
          }
        },
        {
          name: "structura_set_menu_available",
          description: "Toggle the availability of a structura menu item natively.",
          inputSchema: {
            type: "object",
            properties: { 
              item: { type: "string" },
              available: { type: "boolean" }
            },
            required: ["item", "available"]
          }
        },
        {
          name: "structura_fit_to_screen",
          description: "Fits the view of the canvas to fit the bounding box of all nodes.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "structura_center_on_screen",
          description: "Centers the view of the canvas on the screen.",
          inputSchema: {
            type: "object",
            properties: {},
          }
        },
        {
          name: "structura_set_zoom",
          description: "Sets the zoom level of the canvas.",
          inputSchema: {
            type: "object",
            properties: { level: { type: "number" } },
            required: ["level"]
          }
        },
        {
          name: "structura_toggle_mouse_zoom",
          description: "Enable or disable zooming via mouse wheel.",
          inputSchema: {
            type: "object",
            properties: { enabled: { type: "boolean" } },
            required: ["enabled"],
          },
        },
        {
          name: "structura_toggle_mouse_pan",
          description: "Enable or disable canvas panning via mouse drag.",
          inputSchema: {
            type: "object",
            properties: { enabled: { type: "boolean" } },
            required: ["enabled"],
          },
        },
        {
          name: "structura_set_pan",
          description: "Sets the pan coordinates of the canvas.",
          inputSchema: {
            type: "object",
            properties: { x: { type: "number" }, y: { type: "number" } },
            required: ["x", "y"]
          }
        },
        {
          name: "structura_set_canvas_appearance",
          description: "Sets the appearance override (theme) for the active canvas.",
          inputSchema: {
            type: "object",
            properties: { appearance: { type: "string" } },
            required: ["appearance"]
          }
        },
        {
          name: "structura_create_entity",
          description: "Add a new node/entity to the Erathos canvas.",
          inputSchema: {
            type: "object",
            properties: {
              schema_id: { type: "string" },
              id: { type: "string" },
              type: { type: "string" },
              position: { 
                type: "object",
                properties: { x: { type: "number" }, y: { type: "number" } },
                required: ["x", "y"]
              },
              props: { type: "object" }
            },
            required: ["schema_id", "id", "type", "position", "props"]
          }
        },
        {
          name: "structura_update_entity",
          description: "Update an existing node/entity on the Erathos canvas.",
          inputSchema: {
            type: "object",
            properties: {
              schema_id: { type: "string" },
              id: { type: "string" },
              props: { type: "object" },
              position: { 
                type: "object",
                properties: { x: { type: "number" }, y: { type: "number" } },
                required: ["x", "y"]
              }
            },
            required: ["schema_id", "id"]
          }
        },
        {
          name: "structura_create_link",
          description: "Create a connection/link between two entities on the canvas.",
          inputSchema: {
            type: "object",
            properties: {
              schema_id: { type: "string" },
              id: { type: "string" },
              leftEntityId: { type: "string" },
              rightEntityId: { type: "string" },
              leftAnchorId: { type: "string" },
              rightAnchorId: { type: "string" },
              direction: { type: "string", enum: ["default", "left", "right"] },
              type: { type: "string" },
              props: { type: "object" }
            },
            required: ["schema_id", "id", "leftEntityId", "rightEntityId", "leftAnchorId", "rightAnchorId"]
          }
        },
        {
          name: "structura_undo",
          description: "Undo the last action on the canvas.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_redo",
          description: "Redo the previously undone action on the canvas.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_auto_layout",
          description: "Automatically layout all nodes on the canvas.",
          inputSchema: {
            type: "object",
            properties: {
              layout_template: { type: "string", description: "The name of the layout template to force (e.g. 'sugiyama', 'clear')" }
            }
          }
        },
        {
          name: "structura_discovery",
          description: "Discover all available Structura enums, formats, templates, and configurations.",
          inputSchema: {
            type: "object",
            properties: {
              topic: { type: "string", description: "Optional. 'telemetry', 'formats', 'enums', 'layouts', or omit for all." }
            }
          }
        },
        {
          name: "structura_validate_telemetry",
          description: "Validates a given JSON payload against the TelemetryReport schema.",
          inputSchema: {
            type: "object",
            properties: { payload: { type: "object" } },
            required: ["payload"]
          }
        },
        {
          name: "structura_report_progress",
          description: "Report telemetry progress for entities and links.",
          inputSchema: {
            type: "object",
            properties: { payload: { type: "object" } },
            required: ["payload"]
          }
        },

        {
          name: "structura_validate_schema",
          description: "Validate a JSON payload against the specified Structura format.",
          inputSchema: {
            type: "object",
            properties: {
              formatType: { type: "string", enum: ["DAGExchange", "SchemaModel", "WorkspaceState"], description: "The format to validate against" },
              payload: { type: "object", description: "The JSON payload to validate" }
            },
            required: ["formatType", "payload"]
          }
        },
        {
          name: "structura_inject_schema",
          description: "Inject a schema or workspace into Structura. Replaces all legacy load methods.",
          inputSchema: {
            type: "object",
            properties: {
              formatType: { type: "string", enum: ["DAGExchange", "WorkspaceState"], description: "The format of the payload" },
              payload: { type: "object", description: "The JSON payload to inject" }
            },
            required: ["formatType", "payload"]
          }
        },
        {
          name: "structura_optimize_connections",
          description: "Automatically optimize the anchor endpoints for all connections on the canvas.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_export_svg",
          description: "Export the current canvas as an SVG string.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_export_png",
          description: "Export the current canvas as a PNG Data URI.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_export_dag",
          description: "Export the current canvas as a DAG JSON payload.",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "structura_toggle_mouse_zoom",
          description: "Enable or disable zooming via the mouse wheel.",
          inputSchema: { 
            type: "object", 
            properties: {
              enabled: { type: "boolean", description: "Whether to allow mouse wheel zoom." }
            },
            required: ["enabled"]
          }
        }
      ]
    }
  };
};

const formatValidationErrors = (errors: any[]): string => {
  if (!errors || !Array.isArray(errors)) return "Unknown validation error";
  return errors.map(err => {
    const path = err.path && err.path.length > 0 ? err.path.join('.') : 'root';
    const msg = err.message || JSON.stringify(err);
    if (msg.includes("nodes") || msg.includes("Unrecognized key(s) in object: 'nodes'")) {
      return `[Structura Error] Key 'nodes' forbidden at path '${path}'. The root array must be named 'entities' or 'nodes' is invalid.`;
    }
    if (msg.includes("edges") || msg.includes("Unrecognized key(s) in object: 'edges'")) {
      return `[Structura Error] Key 'edges' forbidden at path '${path}'. Connections must be named 'links' or 'edges' is invalid.`;
    }
    return `[Structura Error] Path '${path}': ${msg}`;
  }).join('\n');
};

const getTSFormat = (type: string): string => {
  if (type === 'Telemetry') return `\n\`\`\`ts\ninterface TelemetryReport {\n  entities?: {\n    id: string;\n    state: 'not_started' | 'in_progress' | 'info' | 'warning' | 'error' | 'success' | 'cancelled' | 'escalation' | 'skipped' | 'paused';\n    color?: string;\n    effect?: 'none' | 'glow' | 'pulse' | 'blink' | 'shake';\n  }[];\n  links?: {\n    id: string;\n    direction: 'source-to-target' | 'target-to-source';\n  }[];\n}\n\`\`\`\n`;
  if (type === 'DAGExchange') return `\n\`\`\`ts\ninterface DAGExchange {\n  version: string;\n  nodes: Entity[];\n  edges: LinkProps[];\n  applyAfterLoad?: string[];\n}\n\ninterface Entity {\n  id: string;\n  name: string;\n  position: { x: number; y: number };\n  dimensions: { width: number; height: number };\n  shape?: string;\n  color?: string;\n  description?: string;\n  properties: Record<string, any>;\n}\n\ninterface LinkProps {\n  id: string;\n  sourceAnchorId: string;\n  targetAnchorId: string;\n  sourceEntityId: string;\n  targetEntityId: string;\n}\n\`\`\`\n`;
  if (type === 'SchemaModel') return `\n\`\`\`ts\ninterface SchemaModel {\n  id: string;\n  name: string;\n  entities: Entity[];\n  links: LinkProps[];\n}\n\ninterface Entity {\n  id: string;\n  name: string;\n  position: { x: number; y: number };\n  dimensions: { width: number; height: number };\n  shape?: string;\n  color?: string;\n  description?: string;\n  properties: Record<string, any>;\n}\n\ninterface LinkProps {\n  id: string;\n  sourceAnchorId: string;\n  targetAnchorId: string;\n  sourceEntityId: string;\n  targetEntityId: string;\n}\n\`\`\`\n`;
  return '';
};

const handle_tools_call = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse | Promise<McpResponse> => {
  const { name, arguments: args } = (req.params ?? {}) as any;
  
  try {
    switch (name) {
      case 'structura_get_schema':
        return handle_get_schema(srv, { id: req.id, method: 'atomos-structura/get-schema', params: args });
      case 'structura_get_toolbox_config':
        return { result: { success: true, config: srv._state.toolbox_config }, id: req.id };
      case 'structura_set_toolbox_config':
        srv._state = { ...srv._state, toolbox_config: args.config };
        emit_sse(srv._clients, 'toolbox-config', args.config);
        return { result: { success: true }, id: req.id };
      case 'structura_set_menu_available':
        const currentMenu: Record<string, any> = srv._state.menu_config || {};
        const newMenu = { ...currentMenu, [args.item]: { ...(currentMenu[args.item] || {}), available: args.available } };
        srv._state = { ...srv._state, menu_config: newMenu as any };
        emit_sse(srv._clients, 'menu-config', newMenu);
        return { result: { success: true }, id: req.id };
      case 'structura_fit_to_screen':
        return handle_viewport_fit(srv, { id: req.id, method: 'atomos-structura/viewport/fit-to-screen', params: args });
      case 'structura_center_on_screen':
        return handle_viewport_center(srv, { id: req.id, method: 'atomos-structura/viewport/center', params: args });
      case 'structura_set_zoom':
        return handle_viewport_set_zoom(srv, { id: req.id, method: 'atomos-structura/viewport/set-zoom', params: args });
      case 'structura_set_pan':
        return handle_viewport_set_pan(srv, { id: req.id, method: 'atomos-structura/viewport/set-pan', params: args });
      case 'structura_set_canvas_appearance': {
        const canvas = get_active_canvas(srv._state);
        if (!canvas) return { error: { code: 404, message: 'No active canvas' }, id: req.id };
        const canvasId = srv._state.workspace.active_canvas_id;
        srv._state = {
          ...srv._state,
          workspace: {
            ...srv._state.workspace,
            canvases: {
              ...srv._state.workspace.canvases,
              [canvasId]: { ...canvas, appearance_override: args.appearance }
            }
          }
        };
        emit_sse(srv._clients, 'canvas-appearance-updated', { canvas_id: canvasId, appearance: args.appearance });
        return { result: { success: true }, id: req.id };
      }
      case 'structura_create_entity':
        return handle_create_entity(srv, { id: req.id, method: 'atomos-structura/create-entity', params: args });
      case 'structura_update_entity':
        return handle_update_entity(srv, { id: req.id, method: 'atomos-structura/update-entity', params: args });
      case 'structura_create_link':
        return handle_create_link(srv, { id: req.id, method: 'atomos-structura/create-link', params: args });
      case 'structura_discovery': {
        const topic = args.topic || 'all';
        const getFormats = () => ({
          Telemetry: { description: "JSON Schema for telemetry payloads.", schema: telemetrySchema.toJSONSchema() },
          DAGExchange: { description: "JSON Schema for headless DAG building/import/export.", schema: dagExchangeSchema.toJSONSchema() },
          SchemaModel: { description: "JSON Schema for strict Structura layout and properties.", schema: schemaModelSchema.toJSONSchema() },
          WorkspaceState: { description: "JSON Schema for complete workspace persistence/restoration.", schema: mcpWorkspaceStateSchema.toJSONSchema() }
        });
        const getTelemetry = () => ({
          description: "Available states and effects for telemetry reporting.",
          states: ['not_started', 'in_progress', 'info', 'warning', 'error', 'success', 'cancelled', 'escalation', 'skipped', 'paused'],
          effects: ['none', 'glow', 'pulse', 'blink', 'shake'],
          link_directions: ['source-to-target', 'target-to-source']
        });
        const getEnums = () => ({
          description: "Core enumerations used throughout Structura.",
          data_types: ['string', 'number', 'integer', 'float', 'boolean', 'date', 'uuid', 'json', 'array', 'object'],
          component_types: ['input', 'select', 'checkbox', 'textarea'],
          cardinalities: ['1', '*', '0..1', '1..*']
        });

        if (topic === 'layouts' || topic === 'all') {
          const reqId = `structura_get_layouts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          emit_sse(srv._clients, 'frontend-action-request', { action: 'structura_get_layouts', reqId, args: {} });
          return new Promise<McpResponse>((resolve, reject) => {
            srv._pendingRequests.set(reqId, {
              resolve: (result) => {
                const layouts = result.layouts || [];
                const layoutObj = { description: "Available layout templates/strategies.", layouts };
                if (topic === 'layouts') resolve({ result: layoutObj, id: String(req.id) });
                else resolve({ result: { formats: getFormats(), telemetry: getTelemetry(), enums: getEnums(), layouts: layoutObj }, id: String(req.id) });
              },
              reject: (err) => resolve({ error: { code: 500, message: err.message }, id: String(req.id) })
            });
            setTimeout(() => {
              if (srv._pendingRequests.has(reqId)) {
                srv._pendingRequests.delete(reqId);
                const fallbackLayouts = { description: "Available layout templates/strategies.", layouts: ['sugiyama', 'clear'] };
                if (topic === 'layouts') resolve({ result: fallbackLayouts, id: String(req.id) });
                else resolve({ result: { formats: getFormats(), telemetry: getTelemetry(), enums: getEnums(), layouts: fallbackLayouts }, id: String(req.id) });
              }
            }, 5000);
          });
        }

        if (topic === 'formats') return { result: getFormats(), id: req.id };
        if (topic === 'telemetry') return { result: getTelemetry(), id: req.id };
        if (topic === 'enums') return { result: getEnums(), id: req.id };
        
        return { error: { code: 400, message: `Unknown topic: ${topic}` }, id: req.id };
      }
      case 'structura_validate_schema':
      case 'structura_validate_telemetry': {
        const type = name === 'structura_validate_telemetry' ? 'Telemetry' : args.formatType;
        let result;
        if (type === 'Telemetry') result = f.validateSchema(telemetrySchema, args.payload);
        else if (type === 'DAGExchange') result = f.validateSchema(dagExchangeSchema, args.payload);
        else if (type === 'SchemaModel') result = f.validateSchema(schemaModelSchema, args.payload);
        else if (type === 'WorkspaceState') result = f.validateSchema(mcpWorkspaceStateSchema, { workspace: args.payload });
        else return { error: { code: 400, message: `Unsupported format type ${type}` }, id: req.id };
        
        let errors;
        if (!result.success && result.errors) {
            errors = formatValidationErrors(result.errors);
        }
        return { result: { valid: result.success, errors }, id: req.id };
      }

      case 'structura_report_progress': {
        return new Promise((resolve) => {
          const reqId = crypto.randomUUID();
          srv._pendingRequests.set(reqId, { resolve, reject: () => {} });
          
          srv.broadcast_event('frontend-action-request', {
            action: 'structura_report_progress',
            reqId: reqId,
            args: args.payload ? args.payload : args
          });
        });
      }
      case 'structura_inject_schema': {
        const type = args.formatType;
        let result;
        if (type === 'DAGExchange') result = f.validateSchema(dagExchangeSchema, args.payload);
        else if (type === 'WorkspaceState') result = f.validateSchema(mcpWorkspaceStateSchema, { workspace: args.payload });
        else return { error: { code: 400, message: `Unsupported format type ${type}` }, id: req.id };
        
        const mode = srv._state.workspace.config?.validationMode || 'passive';
        let formattedErrors: string | undefined;
        if (!result.success && result.errors) {
            formattedErrors = formatValidationErrors(result.errors);
            if (mode === 'strict') {
              return { error: { code: 422, message: `Validation failed:\n${formattedErrors}` }, id: req.id };
            } else {
              console.warn(`[Structura MCP] Validation warnings for injection:\n`, formattedErrors);
            }
        }

        if (type === 'WorkspaceState') {
          srv._state = { ...srv._state, workspace: args.payload };
          emit_sse(srv._clients, 'workspace', { type: 'state-loaded', state: srv._state });
        } else if (type === 'DAGExchange') {
          // Send injection as a frontend action
          const reqId = `structura_inject_schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          emit_sse(srv._clients, 'frontend-action-request', { action: 'structura_inject_schema', reqId, args: { dag: args.payload } });
          return new Promise<McpResponse>((resolve) => {
            srv._pendingRequests.set(reqId, {
              resolve: (res) => resolve({ result: { success: true, validationWarnings: mode === 'passive' ? (formattedErrors || undefined) : undefined }, id: String(req.id) }),
              reject: (err) => resolve({ error: { code: 500, message: err.message }, id: String(req.id) })
            });
            setTimeout(() => {
              if (srv._pendingRequests.has(reqId)) {
                srv._pendingRequests.delete(reqId);
                resolve({ error: { code: 504, message: `Injection timeout` }, id: String(req.id) });
              }
            }, 15000);
          });
        }
        return { result: { success: true, validationWarnings: mode === 'passive' ? (formattedErrors ? [formattedErrors] : []) : [] }, id: req.id };
      }
      case 'structura_undo':
      case 'structura_redo':
      case 'structura_auto_layout':
      case 'structura_optimize_connections':
      case 'structura_export_svg':
      case 'structura_export_png':
      case 'structura_export_dag': {
        const reqId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        emit_sse(srv._clients, 'frontend-action-request', { action: name, reqId, args });
        return new Promise<McpResponse>((resolve, reject) => {
          srv._pendingRequests.set(reqId, {
            resolve: (result) => resolve({ result: { success: true, ...result }, id: String(req.id) }),
            reject: (err) => resolve({ error: { code: 500, message: err.message }, id: String(req.id) }) // resolve with error to respond to MCP cleanly
          });
          setTimeout(() => {
            if (srv._pendingRequests.has(reqId)) {
              srv._pendingRequests.delete(reqId);
              resolve({ error: { code: 504, message: `Tool execution timeout for ${name}` }, id: String(req.id) });
            }
          }, 15000); // 15 seconds timeout
        });
      }
      case 'structura_toggle_mouse_zoom': {
        const reqId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        emit_sse(srv._clients, 'frontend-action-request', { action: name, reqId, args });
        return new Promise<McpResponse>((resolve, reject) => {
          srv._pendingRequests.set(reqId, {
            resolve: (result) => resolve({ result: { success: true, ...result }, id: String(req.id) }),
            reject: (err) => resolve({ error: { code: 500, message: err.message }, id: String(req.id) })
          });
          setTimeout(() => {
            if (srv._pendingRequests.has(reqId)) {
              srv._pendingRequests.delete(reqId);
              resolve({ error: { code: 504, message: `Tool execution timeout for ${name}` }, id: String(req.id) });
            }
          }, 15000);
        });
      }
      default:
        return { error: { code: -32601, message: `Tool ${name} not found` }, id: req.id };
    }
  } catch (error) {
    return { error: { code: 500, message: error instanceof Error ? error.message : 'Internal error during tool call' }, id: req.id };
  }
};

/** Factory wrapper for VbsMcpServer (avoids `new` construct signature issues with prototype pattern). */
export const createVbsMcpServer = (cfg?: McpServerConfig): VbsMcpServer => {
  type Ctor = new (cfg?: McpServerConfig) => VbsMcpServer;
  return new (VbsMcpServer as unknown as Ctor)(cfg);
};