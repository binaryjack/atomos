import type { WorkspaceConfig } from '../types/workspace-config.types.js';
import type {
  CanvasModel,
  SchemaModel,
  StructuraWorkspaceState,
} from '../types/workspace.types.js';

export const DEFAULT_CANVAS_ID = 'canvas-default';
export const DEFAULT_SCHEMA_ID = 'schema-default';

export const makeDefaultSchema = (
  id = DEFAULT_SCHEMA_ID,
  name = 'Default Schema'
): SchemaModel => ({
  id,
  name,
  entities: [],
  links: [],
});

export const makeDefaultCanvas = (
  id = DEFAULT_CANVAS_ID,
  name = 'Canvas 1'
): CanvasModel => ({
  id,
  name,
  schemas: { [DEFAULT_SCHEMA_ID]: makeDefaultSchema() },
  active_schema_id: DEFAULT_SCHEMA_ID,
  viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
});

export const makeInitialState = (
  cfg?: WorkspaceConfig
): StructuraWorkspaceState => ({
  workspace: {
    name: 'Untitled Workspace',
    version: '1',
    last_modified: new Date().toISOString(),
    ...(cfg ? { config: cfg } : {}),
    canvases: { [DEFAULT_CANVAS_ID]: makeDefaultCanvas() },
    active_canvas_id: DEFAULT_CANVAS_ID,
    allowed_root_paths: [],
  },
});

export const getActiveCanvas = (
  state: StructuraWorkspaceState
): CanvasModel | undefined =>
  state.workspace.canvases[state.workspace.active_canvas_id];

export const getActiveSchema = (
  state: StructuraWorkspaceState
): SchemaModel | undefined => {
  const canvas = getActiveCanvas(state);
  return canvas ? canvas.schemas[canvas.active_schema_id] : undefined;
};

export const findCanvasForSchema = (
  state: StructuraWorkspaceState,
  schemaId: string
): CanvasModel | undefined =>
  Object.values(state.workspace.canvases).find((c) => schemaId in c.schemas);

export const updateSchemaById = (
  state: StructuraWorkspaceState,
  schemaId: string,
  fn: (schema: SchemaModel) => SchemaModel
): StructuraWorkspaceState => {
  const canvas = findCanvasForSchema(state, schemaId);
  if (!canvas) return state;
  const schema = canvas.schemas[schemaId];
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
          schemas: { ...canvas.schemas, [schemaId]: fn(schema) },
        },
      },
    },
  };
};
