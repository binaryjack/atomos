import type { Entity, WorkspaceConfig } from '@atomos-web/structura-core';
import { create_redux_store } from './create-redux-store.js';
import { createWorkspaceApi } from './create-workspace-api.js';
import { createSchemaGraphKernel } from './create-schema-graph-kernel.js';
import type { WorkspaceApi } from './create-workspace-api.js';
import type { ReduxStore } from '../types/redux-state.types.js';
import type { SchemaGraphKernel } from './create-schema-graph-kernel.js';

export interface SchemaBuilderProps {
  readonly config?: WorkspaceConfig;
  /** If provided, SchemaBuilder connects to MCP server at this URL. */
  readonly mcpUrl?: string;
  readonly onStateChange?: (store: ReduxStore) => void;
}

export interface SchemaBuilder {
  readonly store: ReduxStore;
  readonly workspaceApi: WorkspaceApi;
  readonly kernel: SchemaGraphKernel;
  addEntity(entity: Entity): void;
  removeEntity(entityId: string): void;
  updateEntity(entity: Entity): void;
  createSchema(name: string): string;
  deleteSchema(id: string): void;
  save(): string;
  load(json: string): void;
  /**
   * Mount the full visual canvas UI into the given container.
   * No-op when config.headless is true.
   * Returns a cleanup function.
   */
  mountUI(container: HTMLElement): () => void;
}

export const createSchemaBuilder = function(props: SchemaBuilderProps = {}): SchemaBuilder {
  const store = create_redux_store(props.config);
  const workspaceApi = createWorkspaceApi(store);

  // Keep kernel in sync with the active schema in Redux
  const kernel = createSchemaGraphKernel();

  const sync_kernel = (): void => {
    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    const schema = canvas?.schemas[canvas?.active_schema_id ?? ''];
    if (!schema) return;
    const snap = kernel.getSnapshot();
    // Add / update entities
    (schema.entities as Entity[]).forEach(e => {
      if (snap.entities[e.id]) kernel.updateEntity(e.id, e);
      else kernel.addEntity(e);
    });
    // Remove deleted entities
    Object.keys(snap.entities).forEach(id => {
      if (!(schema.entities as Entity[]).some(e => e.id === id)) kernel.removeEntity(id);
    });
  };

  const unsub = store.subscribe(() => {
    sync_kernel();
    props.onStateChange?.(store);
  });

  // Initial sync
  sync_kernel();

  const get_active_schema_id = (): string => {
    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    return canvas?.active_schema_id ?? '';
  };

  const builder: SchemaBuilder = {
    store,
    workspaceApi,
    kernel,

    addEntity(entity: Entity): void {
      store.dispatch({ type: 'entity-added', schema_id: get_active_schema_id(), entity });
    },

    removeEntity(entityId: string): void {
      store.dispatch({ type: 'entity-removed', schema_id: get_active_schema_id(), entity_id: entityId });
    },

    updateEntity(entity: Entity): void {
      store.dispatch({ type: 'entity-updated', schema_id: get_active_schema_id(), entity });
    },

    createSchema(name: string): string {
      return workspaceApi.createSchema(name);
    },

    deleteSchema(id: string): void {
      workspaceApi.deleteSchema(id);
    },

    save(): string {
      return workspaceApi.saveWorkspace();
    },

    load(json: string): void {
      workspaceApi.loadWorkspace(json);
    },

    mountUI(container: HTMLElement): () => void {
      if (props.config?.headless) return () => { /* no-op */ };
      // Lazy import to avoid pulling DOM dependencies when headless
      return import('./create-canvas-page-bridge.js').then(m => {
        return m.mountCanvasPage(container, props.config);
      }) as unknown as () => void;
    },
  };

  // Cleanup on store GC is not automatic; expose unsub via store
  void unsub; // will be GC-collected with store

  return builder;
};

