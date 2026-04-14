import type { Entity, LinkProps, WorkspaceConfig } from '@atomos-web/structura-core'
import type { AppSettings } from '../features/settings-page/types/settings-page.types.js'

export interface SchemaModel {
  readonly id: string;
  readonly name: string;
  readonly entities: readonly Entity[];
  readonly links: readonly LinkProps[];
}

export interface ViewportState {
  readonly pan: { x: number; y: number };
  readonly zoom: number;
}

export interface CanvasModel {
  readonly id: string;
  readonly name: string;
  readonly schemas: Record<string, SchemaModel>;
  readonly active_schema_id: string;
  readonly viewport: ViewportState;
  readonly appearance_override?: AppSettings['appearance'];
}

export interface WorkspaceState {
  readonly name: string;
  readonly version: string;
  readonly last_modified: string;
  readonly settings?: AppSettings;
  readonly config?: WorkspaceConfig;
  readonly canvases: Record<string, CanvasModel>;
  readonly active_canvas_id: string;
}

export interface ReduxState {
  readonly workspace: WorkspaceState;
  readonly is_settings_open?: boolean;
}

export type ReduxAction =
  | { type: 'entity-moved'; schema_id: string; entity_id: string; x: number; y: number }
  | { type: 'entity-resized'; schema_id: string; entity_id: string; width: number; height: number }
  | { type: 'entity-toggled-collapse'; schema_id: string; entity_id: string; collapsed: boolean }
  | { type: 'entity-updated'; schema_id: string; entity: Entity }
  | { type: 'entity-added'; schema_id: string; entity: Entity }
  | { type: 'entity-removed'; schema_id: string; entity_id: string }
  | { type: 'link-created'; schema_id: string; link_id?: string; from_id: string; to_id: string; from_anchor?: string; to_anchor?: string; leftCardinality?: string; rightCardinality?: string; leftProperty?: string; rightProperty?: string; renderType?: string }
  | { type: 'link-updated'; schema_id: string; link: LinkProps }
  | { type: 'link-removed'; schema_id: string; link_id: string }
  | { type: 'viewport-updated'; viewport: ViewportState }
  | { type: 'settings-updated'; settings: AppSettings }
  | { type: 'settings-toggled'; is_open: boolean }
  | { type: 'schema-created'; id: string; name: string }
  | { type: 'schema-renamed'; id: string; name: string }
  | { type: 'schema-deleted'; id: string }
  | { type: 'schema-activated'; id: string }
  | { type: 'canvas-created'; id: string; name: string }
  | { type: 'canvas-renamed'; id: string; name: string }
  | { type: 'canvas-deleted'; id: string }
  | { type: 'canvas-activated'; id: string }
  | { type: 'canvas-appearance-updated'; canvas_id: string; appearance: AppSettings['appearance'] }
  | { type: 'state-loaded'; state: ReduxState }
  | { type: 'state-reset' };

export interface ReduxStore {
  readonly get_state: () => ReduxState;
  readonly dispatch: (action: ReduxAction) => void;
  readonly subscribe: (listener: (state: ReduxState) => void) => () => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly can_undo: () => boolean;
  readonly can_redo: () => boolean;
  readonly reconcile: (fn: () => void) => void;
}
