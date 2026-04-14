import type { Entity, WorkspaceConfig } from '@atomos-web/structura-core';
import { create_redux_store } from './create-redux-store.js';
import { createWorkspaceApi } from './create-workspace-api.js';
import { createSchemaGraphKernel } from './create-schema-graph-kernel.js';
import { createMenuControl } from './create-menu-control.js';
import type { WorkspaceApi } from './create-workspace-api.js';
import type { ReduxStore } from '../types/redux-state.types.js';
import type { SchemaGraphKernel } from './create-schema-graph-kernel.js';
import type { MenuControl } from '../types/menu-control.types.js';

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
  /** Runtime control of toolbar item availability and values. */
  readonly menuControl: MenuControl;
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
  /**
   * Tear down the session: unsubscribe all listeners, wipe mounted UI (if any),
   * and remove all `vbe2:*` keys from localStorage.
   */
  close(): void;
  /**
   * Reset in-memory Redux state to its initial value and remove all `vbe2:*`
   * keys from localStorage. The session remains usable after this call.
   */
  clearMemory(): void;
}

export const createSchemaBuilder = function(props: SchemaBuilderProps = {}): SchemaBuilder {
  const store = create_redux_store(props.config);
  const workspaceApi = createWorkspaceApi(store);
  const menuControl = createMenuControl(props.config?.menu);

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

  // Track mounted UI cleanup (set by mountUI)
  let mounted_cleanup: (() => void) | null = null;

  const wipe_local_storage = (): void => {
    if (typeof localStorage === 'undefined') return;
    const keys_to_remove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('vbe2:')) keys_to_remove.push(key);
    }
    keys_to_remove.forEach(key => localStorage.removeItem(key));
  };

  const get_active_schema_id = (): string => {
    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    return canvas?.active_schema_id ?? '';
  };

  const builder: SchemaBuilder = {
    store,
    workspaceApi,
    kernel,
    menuControl,

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
      const cleanup_promise = import('./create-canvas-page-bridge.js').then(m => {
        const cleanup = m.mountCanvasPage(container, props.config);
        mounted_cleanup = cleanup;
        return cleanup;
      });
      return () => { void cleanup_promise.then(fn => fn()); };
    },

    close(): void {
      unsub();
      if (mounted_cleanup) {
        mounted_cleanup();
        mounted_cleanup = null;
      }
      wipe_local_storage();
    },

    clearMemory(): void {
      store.dispatch({ type: 'state-reset' });
      wipe_local_storage();
    },
  };

  return builder;
};

