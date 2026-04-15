import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { AppSettings } from '../settings-page/types/settings-page.types.js';
import type { ReduxState, ReduxStore } from '../../types/redux-state.types.js';

export interface McpSyncResult {
  readonly cleanup: () => void;
}

interface McpWorkspaceEvent {
  type: 'settings-updated' | 'schema-created' | 'schema-renamed' | 'schema-deleted' | 'schema-activated' | 'state-loaded'
    | 'canvas-created' | 'canvas-renamed' | 'canvas-deleted' | 'canvas-activated';
  settings?: AppSettings;
  id?: string;
  name?: string;
  state?: ReduxState;
}

export const createMcpSync = (
  store: ReduxStore,
  mcpUrl = 'http://localhost:9743',
): McpSyncResult => {
  let es: EventSource | null = null;
  let syncing = false;

  const applyChange = (data: { entities: Entity[]; links: LinkProps[] }): void => {
    if (syncing) return;
    syncing = true;
    try {
      const st = store.get_state();
      const activeCanvas = st.workspace.canvases[st.workspace.active_canvas_id];
      const schemaId = activeCanvas?.active_schema_id ?? '';
      const schema = activeCanvas?.schemas[schemaId];
      const existingEntityIds = new Set((schema?.entities ?? []).map(e => e.id));
      const existingLinkIds = new Set((schema?.links ?? []).map(l => l.id));

      // entity-added / entity-updated
      data.entities.forEach(e => {
        if (existingEntityIds.has(e.id)) {
          store.dispatch({ type: 'entity-updated', schema_id: schemaId, entity: e });
        } else {
          store.dispatch({ type: 'entity-added', schema_id: schemaId, entity: e });
        }
      });

      // entity-removed (present in Redux but missing from MCP payload)
      const incomingEntityIds = new Set(data.entities.map(e => e.id));
      (schema?.entities ?? []).forEach(e => {
        if (!incomingEntityIds.has(e.id)) {
          store.dispatch({ type: 'entity-removed', schema_id: schemaId, entity_id: e.id });
        }
      });

      // link-created for new links
      data.links.forEach(l => {
        if (!existingLinkIds.has(l.id)) {
          store.dispatch({
            type: 'link-created',
            schema_id: schemaId,
            link_id: l.id,
            from_id: l.leftEntityId,
            to_id: l.rightEntityId,
            from_anchor: l.leftAnchorId,
            to_anchor: l.rightAnchorId,
            leftCardinality: l.leftCardinality,
            rightCardinality: l.rightCardinality,
          });
        }
      });
    } finally {
      syncing = false;
    }
  };

  const applyWorkspaceEvent = (ev: McpWorkspaceEvent): void => {
    if (syncing) return;
    syncing = true;
    try {
      switch (ev.type) {
        case 'state-loaded':
          if (ev.state) store.dispatch({ type: 'state-loaded', state: ev.state });
          break;
        case 'settings-updated':
          if (ev.settings) store.dispatch({ type: 'settings-updated', settings: ev.settings });
          break;
        case 'schema-created':
          if (ev.id && ev.name) store.dispatch({ type: 'schema-created', id: ev.id, name: ev.name });
          break;
        case 'schema-renamed':
          if (ev.id && ev.name) store.dispatch({ type: 'schema-renamed', id: ev.id, name: ev.name });
          break;
        case 'schema-deleted':
          if (ev.id) store.dispatch({ type: 'schema-deleted', id: ev.id });
          break;
        case 'schema-activated':
          if (ev.id) store.dispatch({ type: 'schema-activated', id: ev.id });
          break;
        case 'canvas-created':
          if (ev.id && ev.name) store.dispatch({ type: 'canvas-created', id: ev.id, name: ev.name });
          break;
        case 'canvas-renamed':
          if (ev.id && ev.name) store.dispatch({ type: 'canvas-renamed', id: ev.id, name: ev.name });
          break;
        case 'canvas-deleted':
          if (ev.id) store.dispatch({ type: 'canvas-deleted', id: ev.id });
          break;
        case 'canvas-activated':
          if (ev.id) store.dispatch({ type: 'canvas-activated', id: ev.id });
          break;
      }
    } finally {
      syncing = false;
    }
  };

  try {
    es = new EventSource(`${mcpUrl}/events`);
    es.addEventListener('change', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { entities: Entity[]; links: LinkProps[] };
        applyChange(data);
      } catch { /* ignore malformed events */ }
    });
    es.addEventListener('workspace', (e: MessageEvent) => {
      try {
        applyWorkspaceEvent(JSON.parse(e.data) as McpWorkspaceEvent);
      } catch { /* ignore malformed events */ }
    });
    es.onerror = () => { /* MCP server may not be running — silent */ };
  } catch { /* EventSource not available or URL invalid */ }

  return {
    cleanup: () => { es?.close(); es = null; },
  };
};

