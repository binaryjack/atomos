import type { IncomingMessage, ServerResponse } from 'http';
import { emit_sse, make_initial_state } from './domain/workspace-helpers.js';
import type {
  McpRequest,
  McpResponse,
  McpServerConfig,
  VbsMcpServer,
  VbsMcpServerInstance
} from './mcp.types.js';
import { initializeToolRegistry } from './tools/init.js';
import { toolRegistry } from './tools/tool-registry.js';

export * from './mcp.types.js';

// Initialize Tool Command Registry
initializeToolRegistry();

// Prototype Constructor
export function VbsMcpServer(this: VbsMcpServerInstance, cfg?: McpServerConfig): void {
  Object.defineProperty(this, '_state', {
    enumerable: false,
    writable: true,
    value: make_initial_state(cfg?.initialConfig)
  });
  Object.defineProperty(this, '_clients', {
    enumerable: false,
    writable: true,
    value: new Set<ServerResponse>()
  });
  Object.defineProperty(this, '_cfg', {
    enumerable: false,
    writable: false,
    value: cfg ?? {}
  });
  Object.defineProperty(this, '_pendingRequests', {
    enumerable: false,
    writable: true,
    value: new Map<string, { resolve: (result: unknown) => void; reject: (err: Error) => void }>()
  });
}

// Prototype Methods
VbsMcpServer.prototype.broadcast_event = function (
  this: VbsMcpServerInstance,
  event: string,
  data: unknown
): void {
  emit_sse(this._clients, event, data);
};

VbsMcpServer.prototype.handleSSE = function (
  this: VbsMcpServerInstance,
  req: IncomingMessage,
  res: ServerResponse
): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.writeHead(200);
  res.write(':ok\n\n');
  this._clients.add(res);
  req.on('close', () => this._clients.delete(res));
};

VbsMcpServer.prototype.handleRequest = async function (
  this: VbsMcpServerInstance,
  req: IncomingMessage,
  res: ServerResponse
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
      id: ''
    }));
  }
};

// HTTP Utility
const read_body = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: unknown) => { body += String(chunk); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });

const METHOD_ALIASES: Record<string, string> = {
  'atomos-structura/viewport/get': 'structura_get_viewport',
  'atomos-structura/viewport/set-zoom': 'structura_set_zoom',
  'atomos-structura/viewport/set-pan': 'structura_set_pan',
  'atomos-structura/viewport/center': 'structura_center_on_screen',
  'atomos-structura/viewport/fit-to-screen': 'structura_fit_to_screen',
  'atomos-structura/session/close': 'structura_session_close',
  'atomos-structura/session/clear-memory': 'structura_session_clear_memory',
  'atomos-structura/create-entity': 'structura_create_entity',
  'atomos-structura/get-entity': 'structura_get_entity',
  'atomos-structura/update-entity': 'structura_update_entity',
  'atomos-structura/delete-entity': 'structura_delete_entity',
  'atomos-structura/create-link': 'structura_create_link',
  'atomos-structura/sync-state': 'structura_sync_state',
  'atomos-structura/get-settings': 'structura_get_settings',
  'atomos-structura/update-settings': 'structura_update_settings',
  'atomos-structura/list-schemas': 'structura_list_schemas',
  'atomos-structura/create-schema': 'structura_create_schema',
  'atomos-structura/rename-schema': 'structura_rename_schema',
  'atomos-structura/delete-schema': 'structura_delete_schema',
  'atomos-structura/activate-schema': 'structura_activate_schema',
  'atomos-structura/get-workspace': 'structura_get_workspace',
  'atomos-structura/load-workspace': 'structura_load_workspace',
  'atomos-structura/get-schema': 'structura_get_schema',
  'atomos-structura/inject-schema': 'structura_inject_schema',
  'atomos-structura/set-workspace-mode': 'structura_set_workspace_mode',
  'atomos-structura/group-schema': 'structura_group_schema',
};

// Method Normalizer
const normalizeMethodName = (method: string): string => {
  if (METHOD_ALIASES[method]) return METHOD_ALIASES[method]!;
  let name = method;
  if (name.startsWith('atomos-structura/')) {
    name = name.replace('atomos-structura/', '');
  }
  if (!name.startsWith('structura_')) {
    name = `structura_${name}`;
  }
  return name.replace(/[\/-]/g, '_');
};

// Request Router delegating to Tool Registry & Handlers
const process_request = async (srv: VbsMcpServerInstance, req: McpRequest): Promise<McpResponse> => {
  if (req.method === 'tools/list') {
    return { id: req.id, result: { tools: toolRegistry.getToolsList() } };
  }
  if (req.method === 'tools/call') {
    return toolRegistry.executeToolCall(srv, req);
  }
  if (req.method === 'atomos-structura/tool-result') {
    return handle_tool_result(srv, req);
  }

  // Legacy direct RPC call mapping
  const normalizedTool = normalizeMethodName(req.method);
  return toolRegistry.executeToolCall(srv, {
    ...req,
    params: { name: normalizedTool, arguments: (req.params as Record<string, unknown>) ?? {} }
  });
};

const handle_tool_result = (srv: VbsMcpServerInstance, req: McpRequest): McpResponse => {
  const { reqId, result, error } = (req.params ?? {}) as { reqId: string; result?: unknown; error?: string };
  const pending = srv._pendingRequests.get(reqId);
  if (pending) {
    if (error) pending.reject(new Error(error));
    else pending.resolve(result);
    srv._pendingRequests.delete(reqId);
  }
  return { result: { success: true }, id: req.id };
};

// Factory Wrapper
export const createVbsMcpServer = (cfg?: McpServerConfig): VbsMcpServer => {
  type Ctor = new (cfg?: McpServerConfig) => VbsMcpServer;
  return new (VbsMcpServer as unknown as Ctor)(cfg);
};