import type { Entity, LinkProps, WorkspaceConfig, WorkspaceMenuConfig } from '@atomos-web/structura-core';
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
}

// Public request/response types

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
    const response = process_request(this, request);
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

const process_request = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
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
    case 'atomos-structura/load-workspace':  return handle_load_workspace(srv, req);
    case 'atomos-structura/report-progress': return handle_report_progress(srv, req);
    case 'atomos-structura/viewport/get':       return handle_viewport_get(srv, req);
    case 'atomos-structura/viewport/set-zoom':  return handle_viewport_set_zoom(srv, req);
    case 'atomos-structura/viewport/set-pan':   return handle_viewport_set_pan(srv, req);
    case 'atomos-structura/viewport/center':    return handle_viewport_center(srv, req);
    case 'atomos-structura/viewport/fit-to-screen': return handle_viewport_fit(srv, req);
    case 'atomos-structura/session/close':        return handle_session_close(srv, req);
    case 'atomos-structura/session/clear-memory': return handle_session_clear_memory(srv, req);
    default: return { error: { code: -32601, message: 'Method not found' }, id: req.id };
  }
};

// Entity handlers

const handle_create_entity = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const params = req.params as { schema_id?: string } & Entity;
  const { schema_id, ...entity } = params;
  if (!schema_id) return { error: { code: 400, message: 'schema_id is required' }, id: req.id };
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
  const { schema_id, ...entity } = params;
  if (!schema_id) return { error: { code: 400, message: 'schema_id is required' }, id: req.id };
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
  const { schema_id, entityId } = req.params as { schema_id?: string; entityId: string };
  if (!schema_id) return { error: { code: 400, message: 'schema_id is required' }, id: req.id };
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
  const { schema_id, ...link } = params;
  if (!schema_id) return { error: { code: 400, message: 'schema_id is required' }, id: req.id };
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
  const { schema_id, entities = [], links = [], settings, menu_config } = req.params as {
    schema_id?: string;
    entities?: Entity[];
    links?: LinkProps[];
    settings?: Record<string, unknown>;
    menu_config?: WorkspaceMenuConfig;
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

interface LegacyWorkspacePayload {
  active_schema_id?: string;
  schemas?: Array<{ id: string; name: string; entities: Entity[]; links: LinkProps[] }>;
  settings?: unknown;
}

const is_legacy_payload = (w: unknown): w is LegacyWorkspacePayload =>
  typeof w === 'object' && w !== null && !('workspace' in w);

function isPathAllowed(filePath: string, allowedRoots: string[]): boolean {
  if (!allowedRoots || allowedRoots.length === 0) return true; // Default to allow all if not set yet (v1 parity)
  return allowedRoots.some(root => filePath.startsWith(root));
}

function hydraterPlanCodernic(payload: any): McpWorkspaceState {
  // Si le payload contient déjà des canvases, c'est un format Atomos natif, on ne fait rien
  if (payload.workspace && payload.workspace.canvases) {
    return payload as McpWorkspaceState;
  }

  // Extraction des lanes (Format Codernic de dag_config.schema.json / dag-generator.ts)
  const lanes = payload.lanes || [];

  // Calcul du layout spatial via Dagre
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 60, edgesep: 20, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));

  lanes.forEach((lane: any) => {
    g.setNode(lane.id, { width: 200, height: 100 });
    if (lane.dependsOn) {
      lane.dependsOn.forEach((depId: string) => g.setEdge(depId, lane.id));
    }
  });

  dagre.layout(g);

  // Construction des entités graphiques Atomos
  const entities = lanes.map((lane: any) => {
    const node = g.node(lane.id);
    return {
      id: lane.id,
      type: 'implementation',
      position: { x: node.x, y: node.y },
      props: {
        agentFile: lane.agentFile || "default-agent.agent.json",
        prompt: lane.prompt || "",
        active: lane.active ?? true,
        status: 'pending',
        log_stream: ""
      }
    };
  });

  const links = lanes.flatMap((lane: any) =>
    (lane.dependsOn || []).map((depId: string) => ({
      id: `link-${depId}-${lane.id}`,
      source: depId,
      target: lane.id,
      type: 'default'
    }))
  );

  // Hydratation complète du Redux Mirror d'Atomos
  const schema_id = "codernic-execution-graph";
  const canvas_id = "main-canvas";

  return {
    workspace: {
      name: "Codernic Autonomous Plan",
      version: "1.0.0",
      last_modified: new Date().toISOString(),
      active_canvas_id: canvas_id,
      canvases: {
        [canvas_id]: {
          id: canvas_id,
          name: "Execution Pipeline",
          active_schema_id: schema_id,
          viewport: { pan: { x: 100, y: 100 }, zoom: 1 },
          schemas: {
            [schema_id]: {
              id: schema_id,
              name: "Agent DAG",
              entities,
              links
            }
          }
        }
      }
    }
  };
}

const handle_load_workspace = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { workspace, filePath } = req.params as { workspace: any; filePath?: string };

  if (filePath && !isPathAllowed(filePath, srv._state.workspace.allowed_root_paths || [])) {
    return {
      error: {
        code: -32602,
        message: `Access Denied: Le fichier ${filePath} est en dehors des racines du Workspace Multi-Root.`,
      },
      id: req.id,
    };
  }

  const hydratedWorkspace = hydraterPlanCodernic(workspace);
  const runtimeConfig = srv._state.workspace.config;

  if (filePath) {
    if (srv._watcher) {
      (srv._watcher as any).close();
    }
    srv._watcher = (chokidar.watch(filePath) as any).on('change', async () => {
      try {
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const rawJson = JSON.parse(fileContent);
        const hydratedState = hydraterPlanCodernic(rawJson);
        (srv as any).broadcast_event('workspace-mutated', hydratedState);
      } catch (err) {
        console.error("Failed to broadcast file change to SSE:", err);
      }
    });
  }

  const processedWorkspace = hydratedWorkspace;
  if (is_legacy_payload(processedWorkspace)) {
    const schemasRecord: Record<string, SchemaModel> = {};
    (processedWorkspace.schemas ?? []).forEach(s => { schemasRecord[s.id] = { ...s }; });
    const activeSchemaId = processedWorkspace.active_schema_id ?? DEFAULT_SCHEMA_ID;
    const baseCanvas = make_default_canvas();
    const rebuilt: McpWorkspaceState = {
      workspace: {
        name: 'Untitled Workspace',
        version: '1',
        last_modified: new Date().toISOString(),
        ...(processedWorkspace.settings !== undefined ? { settings: processedWorkspace.settings as Record<string, unknown> } : {}),
        canvases: {
          [DEFAULT_CANVAS_ID]: {
            ...baseCanvas,
            schemas: Object.keys(schemasRecord).length > 0 ? schemasRecord : baseCanvas.schemas,
            active_schema_id: activeSchemaId,
          },
        },
        active_canvas_id: DEFAULT_CANVAS_ID,
      },
    };
    srv._state = runtimeConfig
      ? { ...rebuilt, workspace: { ...rebuilt.workspace, config: runtimeConfig } }
      : rebuilt;
  } else {
    srv._state = runtimeConfig
      ? { ...processedWorkspace, workspace: { ...processedWorkspace.workspace, config: runtimeConfig } }
      : processedWorkspace;
  }
  emit_sse(srv._clients, 'workspace', { type: 'state-loaded', state: srv._state });
  return { result: { success: true }, id: req.id };
};

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

/** Factory wrapper for VbsMcpServer (avoids `new` construct signature issues with prototype pattern). */
export const createVbsMcpServer = (cfg?: McpServerConfig): VbsMcpServer => {
  type Ctor = new (cfg?: McpServerConfig) => VbsMcpServer;
  return new (VbsMcpServer as unknown as Ctor)(cfg);
};