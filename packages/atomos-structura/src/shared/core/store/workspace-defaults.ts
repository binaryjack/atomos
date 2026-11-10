// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkspaceConfig } from '@atomos-web/structura-core';
import type { CanvasModel, ReduxState, SchemaModel } from '../../types/redux-state.types.js';
import { PERSISTED_STATE_VERSION } from '../../workflow-document/model/persisted-state.js';

export const DEFAULT_CANVAS_ID = 'canvas-default';
export const DEFAULT_SCHEMA_ID = 'schema-default';

export const makeDefaultSchema = (id = DEFAULT_SCHEMA_ID, name = 'Default Schema'): SchemaModel => ({
  type: 'SchemaModel', id, name, entities: [], links: [],
});

export const makeDefaultCanvas = (id = DEFAULT_CANVAS_ID, name = 'Canvas 1'): CanvasModel => ({
  id,
  name,
  schemas: { [DEFAULT_SCHEMA_ID]: makeDefaultSchema() },
  active_schema_id: DEFAULT_SCHEMA_ID,
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
});

export const makeInitialReduxState = (config?: WorkspaceConfig): ReduxState => ({
  workspace: {
    name: 'Untitled Workspace',
    version: PERSISTED_STATE_VERSION,
    last_modified: new Date().toISOString(),
    ...(config ? { config } : {}),
    canvases: { [DEFAULT_CANVAS_ID]: makeDefaultCanvas() },
    active_canvas_id: DEFAULT_CANVAS_ID,
  },
  is_settings_open: false,
});

export const touch = (state: ReduxState, patch: Partial<ReduxState['workspace']>): ReduxState => ({
  ...state,
  workspace: { ...state.workspace, ...patch, last_modified: new Date().toISOString() },
});

export const updateActiveCanvas = (state: ReduxState, fn: (canvas: CanvasModel) => CanvasModel): ReduxState => {
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  if (!canvas) return state;
  return touch(state, { canvases: { ...state.workspace.canvases, [state.workspace.active_canvas_id]: fn(canvas) } });
};

export const updateSchemaInCanvas = (
  canvas: CanvasModel,
  schemaId: string,
  fn: (schema: SchemaModel) => SchemaModel,
): CanvasModel => {
  const schema = canvas.schemas[schemaId];
  if (!schema) return canvas;
  return { ...canvas, schemas: { ...canvas.schemas, [schemaId]: fn(schema) } };
};

/** Applies `fn` to a schema of the active canvas, creating the schema when missing. */
export const upsertSchemaInActiveCanvas = (
  state: ReduxState, schemaId: string, fn: (schema: SchemaModel) => SchemaModel,
): ReduxState => updateActiveCanvas(state, canvas => {
  const schema = canvas.schemas[schemaId] ?? makeDefaultSchema(schemaId);
  return { ...canvas, schemas: { ...canvas.schemas, [schemaId]: fn(schema) } };
});
