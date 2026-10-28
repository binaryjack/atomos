import type { Entity, LinkProps, WorkspaceConfig, WorkspaceMenuConfig } from '../index.js';

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

export interface StructuraWorkspaceState {
  workspace: WorkspaceState;
  is_settings_open?: boolean;
  menu_config?: WorkspaceMenuConfig;
  toolbox_config?: Record<string, unknown>;
}
