import { entitySchema, linkSchema, type Entity, type LinkProps, type WorkspaceConfig, type WorkspaceMenuConfig } from '@atomos-web/structura-core';
import { f } from '@binaryjack/formular.dev';
import type { IncomingMessage, ServerResponse } from 'http';

export type { WorkspaceConfig, WorkspaceMenuConfig };

export interface SchemaModel {
  readonly id: string;
  readonly name: string;
  entities: Entity[];
  links: LinkProps[];
}

export interface CanvasModel {
  readonly id: string;
  readonly name: string;
  schemas: Record<string, SchemaModel>;
  active_schema_id: string;
  viewport: { pan: { x: number; y: number }; zoom: number };
  readonly appearance_override?: Record<string, unknown>;
}

export interface WorkspaceState {
  readonly name: string;
  readonly version: string;
  last_modified: string;
  mode?: 1 | 2 | 3;
  settings?: Record<string, unknown>;
  config?: WorkspaceConfig;
  canvases: Record<string, CanvasModel>;
  active_canvas_id: string;
  allowed_root_paths?: string[];
}

export interface McpWorkspaceState {
  workspace: WorkspaceState;
  is_settings_open?: boolean;
  menu_config?: WorkspaceMenuConfig;
  toolbox_config?: Record<string, unknown>;
}

// Validation schemas via Formular
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
  appearance_override: f.record(f.string(), f.string())
});

export const workspaceStateSchema = f.object({
  name: f.string().nonempty(),
  version: f.string().nonempty(),
  last_modified: f.string().nonempty(),
  settings: f.record(f.string(), f.string()),
  config: f.object({}),
  canvases: f.record(f.string(), canvasModelSchema),
  active_canvas_id: f.string().nonempty(),
  allowed_root_paths: f.array(f.string())
});

export const mcpWorkspaceStateSchema = f.object({
  workspace: workspaceStateSchema,
  is_settings_open: f.boolean(),
  menu_config: f.object({}),
  toolbox_config: f.object({})
});

export const telemetrySchema = f.object({
  entities: f.array(f.object({
    id: f.string().nonempty(),
    state: f.string().nonempty(),
    color: f.string(),
    effect: f.string()
  })),
  links: f.array(f.object({
    id: f.string().nonempty(),
    direction: f.string().nonempty()
  }))
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

export interface McpChangePayload {
  readonly schema_id: string;
  readonly entities: Entity[];
  readonly links: LinkProps[];
}

export type McpWorkspaceEventType =
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

export interface McpWorkspacePayload {
  readonly type: McpWorkspaceEventType;
  readonly settings?: Record<string, unknown>;
  readonly id?: string;
  readonly name?: string;
  readonly state?: McpWorkspaceState;
}

export interface McpServerConfig {
  readonly initialConfig?: WorkspaceConfig;
  readonly onSessionClose?: () => void;
  readonly onClearMemory?: () => void;
}

export interface VbsMcpServerInstance {
  _state: McpWorkspaceState;
  _clients: Set<ServerResponse>;
  _cfg: McpServerConfig;
  _pendingRequests: Map<string, { resolve: (result: unknown) => void; reject: (err: Error) => void }>;
  broadcast_event(event: string, data: unknown): void;
}

export interface VbsMcpServer {
  handleSSE(req: IncomingMessage, res: ServerResponse): void;
  handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
  broadcast_event(event: string, data: unknown): void;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}
