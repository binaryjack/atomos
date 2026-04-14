import type { AppSettings } from '../features/settings-page/types/settings-page.types.js';
import type { ReduxState, ReduxStore, ViewportState } from '../types/redux-state.types.js';

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

export interface WorkspaceSchemaInfo {
  readonly id: string;
  readonly name: string;
  readonly entityCount: number;
  readonly linkCount: number;
}

export interface WorkspaceCanvasInfo {
  readonly id: string;
  readonly name: string;
  readonly schemaCount: number;
}

export interface WorkspaceApi {
  /** Current workspace-level settings or undefined if never saved. */
  getSettings(): AppSettings | undefined;
  /** Dispatch a settings-updated action. */
  setSettings(settings: AppSettings): void;

  /** Serialize the full Redux state to a JSON string (round-trips via loadWorkspace). */
  saveWorkspace(): string;
  /** Replace the entire Redux state from a previously saved JSON string. */
  loadWorkspace(json: string): void;

  /** List all canvases. */
  listCanvases(): readonly WorkspaceCanvasInfo[];
  /** Create a new canvas. Returns the new canvas id. */
  createCanvas(name: string): string;
  /** Rename an existing canvas. */
  renameCanvas(id: string, name: string): void;
  /** Delete a canvas. */
  deleteCanvas(id: string): void;
  /** Switch the active canvas. */
  activateCanvas(id: string): void;
  /** Id of the currently active canvas. */
  getActiveCanvasId(): string;
  /** Set per-canvas appearance override. */
  setCanvasAppearance(canvas_id: string, appearance: AppSettings['appearance']): void;

  /** List all schema tabs in the active canvas. */
  listSchemas(): readonly WorkspaceSchemaInfo[];
  /** Create a new schema tab in the active canvas. Returns the new schema id. */
  createSchema(name: string): string;
  /** Rename an existing schema tab. */
  renameSchema(id: string, name: string): void;
  /** Delete a schema tab. */
  deleteSchema(id: string): void;
  /** Switch the active schema tab. */
  activateSchema(id: string): void;
  /** Id of the currently active schema in the active canvas. */
  getActiveSchemaId(): string;

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: (state: ReduxState) => void): () => void;

  // ── Viewport API ──────────────────────────────────────────────────────

  /** Current viewport (zoom + pan) of the active canvas. */
  getViewport(): ViewportState;
  /** Set zoom level; clamped to [0.1, 4]. */
  setZoom(level: number): void;
  /** Replace the entire viewport state. */
  setViewport(viewport: ViewportState): void;
  /**
   * Pan so that the centroid of all entities is centred on the given screen
   * dimensions (defaults to 800×600 when not provided). Pure Redux — no DOM.
   */
  centerOnScreen(opts?: { width?: number; height?: number }): void;
  /**
   * Compute a zoom+pan from the entities' bounding box so that all nodes fit
   * within the given screen dimensions (defaults to 800×600) with padding.
   * Zoom is capped at 2×.
   */
  fitToScreen(opts?: { width?: number; height?: number; padding?: number }): void;
}

const getActiveCanvas = (store: ReduxStore) => {
  const st = store.get_state();
  return st.workspace.canvases[st.workspace.active_canvas_id];
};

export const createWorkspaceApi = function(store: ReduxStore): WorkspaceApi {
  const api: WorkspaceApi = {
    getSettings: () => store.get_state().workspace.settings,

    setSettings: (settings) => store.dispatch({ type: 'settings-updated', settings }),

    saveWorkspace: () => JSON.stringify(store.get_state()),

    loadWorkspace: (json: string) => {
      const state = JSON.parse(json) as ReduxState;
      store.dispatch({ type: 'state-loaded', state });
    },

    listCanvases: () => {
      const { canvases } = store.get_state().workspace;
      return Object.values(canvases).map(c => ({
        id: c.id,
        name: c.name,
        schemaCount: Object.keys(c.schemas).length,
      }));
    },

    createCanvas: (name: string) => {
      const id = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      store.dispatch({ type: 'canvas-created', id, name });
      return id;
    },

    renameCanvas: (id: string, name: string) => store.dispatch({ type: 'canvas-renamed', id, name }),

    deleteCanvas: (id: string) => store.dispatch({ type: 'canvas-deleted', id }),

    activateCanvas: (id: string) => store.dispatch({ type: 'canvas-activated', id }),

    getActiveCanvasId: () => store.get_state().workspace.active_canvas_id,

    setCanvasAppearance: (canvas_id, appearance) =>
      store.dispatch({ type: 'canvas-appearance-updated', canvas_id, appearance }),

    listSchemas: () => {
      const canvas = getActiveCanvas(store);
      if (!canvas) return [];
      return Object.values(canvas.schemas).map(s => ({
        id: s.id,
        name: s.name,
        entityCount: s.entities.length,
        linkCount: s.links.length,
      }));
    },

    createSchema: (name: string) => {
      if (store.get_state().workspace.config?.allow_multiple_schemas === false) {
        throw new Error('Multi-schema disabled by workspace config');
      }
      const id = `schema-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      store.dispatch({ type: 'schema-created', id, name });
      return id;
    },

    renameSchema: (id: string, name: string) => store.dispatch({ type: 'schema-renamed', id, name }),

    deleteSchema: (id: string) => store.dispatch({ type: 'schema-deleted', id }),

    activateSchema: (id: string) => store.dispatch({ type: 'schema-activated', id }),

    getActiveSchemaId: () => getActiveCanvas(store)?.active_schema_id ?? '',

    subscribe: (listener) => store.subscribe(listener),

    getViewport: () => {
      const canvas = getActiveCanvas(store);
      return canvas?.viewport ?? { pan: { x: 0, y: 0 }, zoom: 1 };
    },

    setZoom: (level: number) => {
      const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, level));
      const canvas = getActiveCanvas(store);
      const pan = canvas?.viewport.pan ?? { x: 0, y: 0 };
      store.dispatch({ type: 'viewport-updated', viewport: { pan, zoom: clamped } });
    },

    setViewport: (viewport: ViewportState) => {
      store.dispatch({ type: 'viewport-updated', viewport });
    },

    centerOnScreen: (opts?: { width?: number; height?: number }) => {
      const canvas = getActiveCanvas(store);
      if (!canvas) return;
      const schema = canvas.schemas[canvas.active_schema_id];
      if (!schema || schema.entities.length === 0) return;
      const { zoom } = canvas.viewport;
      const screenW = opts?.width ?? 800;
      const screenH = opts?.height ?? 600;
      let sumX = 0;
      let sumY = 0;
      schema.entities.forEach(e => {
        sumX += e.position.x + (e.dimensions?.width ?? 0) / 2;
        sumY += e.position.y + (e.dimensions?.height ?? 0) / 2;
      });
      const cx = sumX / schema.entities.length;
      const cy = sumY / schema.entities.length;
      store.dispatch({
        type: 'viewport-updated',
        viewport: { zoom, pan: { x: screenW / 2 - cx * zoom, y: screenH / 2 - cy * zoom } },
      });
    },

    fitToScreen: (opts?: { width?: number; height?: number; padding?: number }) => {
      const canvas = getActiveCanvas(store);
      if (!canvas) return;
      const schema = canvas.schemas[canvas.active_schema_id];
      if (!schema || schema.entities.length === 0) return;
      const screenW = opts?.width ?? 800;
      const screenH = opts?.height ?? 600;
      const padding = opts?.padding ?? 100;
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
      const newZoom = Math.min(
        Math.min((screenW - padding * 2) / boxW, (screenH - padding * 2) / boxH),
        2,
      );
      const cx = minX + boxW / 2;
      const cy = minY + boxH / 2;
      store.dispatch({
        type: 'viewport-updated',
        viewport: { zoom: newZoom, pan: { x: screenW / 2 - cx * newZoom, y: screenH / 2 - cy * newZoom } },
      });
    },
  };

  return api;
};
