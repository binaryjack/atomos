// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxAction, ReduxState, SchemaModel } from '../../types/redux-state.types.js';
import type { ActionHandlerMap } from './reduce-entity-actions.js';
import { entityAndLinkHandlers } from './reduce-entity-actions.js';
import {
  makeDefaultCanvas, makeDefaultSchema, makeInitialReduxState, touch, updateActiveCanvas, updateSchemaInCanvas,
} from './workspace-defaults.js';

const schemaLimitReached = (state: ReduxState): boolean =>
  state.workspace.config?.allow_multiple_schemas === false
  && Object.keys(state.workspace.canvases[state.workspace.active_canvas_id]?.schemas ?? {}).length >= 1;

const addSchema = (state: ReduxState, id: string, name: string): ReduxState => updateActiveCanvas(state, canvas => {
  if (canvas.schemas[id]) return canvas;
  return { ...canvas, schemas: { ...canvas.schemas, [id]: makeDefaultSchema(id, name) }, active_schema_id: id };
});

const schemaHandlers: ActionHandlerMap = {
  // Standalone fallback: generate an ID when no dispatch hook intercepted the intent.
  'schema-create-auto': (state, a) => (schemaLimitReached(state)
    ? state
    : addSchema(state, `schema-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, a.name)),
  'schema-created': (state, a) => (schemaLimitReached(state) ? state : addSchema(state, a.id, a.name)),
  'schema-renamed': (state, a) =>
    updateActiveCanvas(state, canvas => updateSchemaInCanvas(canvas, a.id, schema => ({ ...schema, name: a.name }))),
  'schema-deleted': (state, a) => updateActiveCanvas(state, canvas => {
    if (Object.keys(canvas.schemas).length <= 1) return canvas;
    const { [a.id]: _removed, ...remaining } = canvas.schemas;
    const nextActive = canvas.active_schema_id === a.id ? (Object.keys(remaining)[0] ?? canvas.active_schema_id) : canvas.active_schema_id;
    return { ...canvas, schemas: remaining, active_schema_id: nextActive };
  }),
  'schema-activated': (state, a) =>
    updateActiveCanvas(state, canvas => (canvas.schemas[a.id] ? { ...canvas, active_schema_id: a.id } : canvas)),
  'schema-grouped': (state, a) => updateActiveCanvas(state, canvas => updateSchemaInCanvas(canvas, a.schema_id, schema => ({
    ...schema,
    isGroup: true,
    print: a.print ?? schema.print,
    groupColor: a.groupColor ?? schema.groupColor,
    depends_on: a.depends_on ?? schema.depends_on,
  } as SchemaModel))),
};

const canvasHandlers: ActionHandlerMap = {
  'canvas-created': (state, a) => (state.workspace.canvases[a.id]
    ? state
    : touch(state, { canvases: { ...state.workspace.canvases, [a.id]: makeDefaultCanvas(a.id, a.name) }, active_canvas_id: a.id })),
  'canvas-renamed': (state, a) => {
    const canvas = state.workspace.canvases[a.id];
    return canvas ? touch(state, { canvases: { ...state.workspace.canvases, [a.id]: { ...canvas, name: a.name } } }) : state;
  },
  'canvas-deleted': (state, a) => {
    if (Object.keys(state.workspace.canvases).length <= 1) return state;
    const { [a.id]: _removed, ...remaining } = state.workspace.canvases;
    const active = state.workspace.active_canvas_id;
    return touch(state, { canvases: remaining, active_canvas_id: active === a.id ? (Object.keys(remaining)[0] ?? active) : active });
  },
  'canvas-activated': (state, a) => (state.workspace.canvases[a.id]
    ? { ...state, workspace: { ...state.workspace, active_canvas_id: a.id } }
    : state),
  'canvas-appearance-updated': (state, a) => {
    const canvas = state.workspace.canvases[a.canvas_id];
    return canvas
      ? touch(state, { canvases: { ...state.workspace.canvases, [a.canvas_id]: { ...canvas, appearance_override: a.appearance } } })
      : state;
  },
};

const sessionHandlers: ActionHandlerMap = {
  'viewport-updated': (state, a) => updateActiveCanvas(state, canvas => ({ ...canvas, viewport: a.viewport })),
  'settings-updated': (state, a) => touch(state, { settings: a.settings }),
  'settings-toggled': (state, a) => (state.workspace.config?.headless ? state : { ...state, is_settings_open: a.is_open }),
  'workspace-mode-set': (state, a) => touch(state, { mode: a.mode }),
  'state-loaded': (_state, a) => a.state,
  'state-reset': (state) => makeInitialReduxState(state.workspace.config),
};

const handlers: ActionHandlerMap = { ...entityAndLinkHandlers, ...schemaHandlers, ...canvasHandlers, ...sessionHandlers };

/** Pure workspace reducer. Unknown actions return the same state reference. */
export const reduceWorkspaceState = (state: ReduxState, action: ReduxAction): ReduxState => {
  const handler = handlers[action.type] as ((s: ReduxState, a: ReduxAction) => ReduxState) | undefined;
  return handler ? handler(state, action) : state;
};
