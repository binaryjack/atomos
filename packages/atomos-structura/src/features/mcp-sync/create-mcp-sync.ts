import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { ReduxState, ReduxStore } from '../../types/redux-state.types.js';
import type { AppSettings } from '../settings-page/types/settings-page.types.js';

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

  const applyChange = (data: { schema_id?: string; entities: Entity[]; links: LinkProps[] }): void => {
    if (syncing) return;
    syncing = true;
    try {
      const st = store.get_state();
      const activeCanvas = st.workspace.canvases[st.workspace.active_canvas_id];
      // Use the schema_id from the SSE payload if provided, otherwise fall back to active
      const schemaId = data.schema_id ?? activeCanvas?.active_schema_id ?? '';
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
    es.addEventListener('node-progress', (e: MessageEvent) => {
      try {
        const { schema_id, node_id, status, log_stream } = JSON.parse(e.data);
        const st = store.get_state();
        const activeCanvas = st.workspace.canvases[st.workspace.active_canvas_id];
        
        // Use the schema_id from the SSE payload if provided, otherwise fall back to active
        const schemaIdToUse = schema_id ?? activeCanvas?.active_schema_id ?? '';
        const schema = activeCanvas?.schemas[schemaIdToUse];
        
        const entity = schema?.entities.find(e => e.id === node_id);
        if (entity) {
          store.dispatch({
            type: 'entity-updated',
            schema_id: schemaIdToUse,
            entity: {
              ...entity,
              properties: (() => {
                const keys = new Set(entity.properties.map(p => p.key));
                const props = entity.properties.map(p => {
                  if (p.key === 'status') return { ...p, value: status };
                  if (p.key === 'log_stream') return { ...p, value: log_stream };
                  return p;
                });
                if (!keys.has('status')) {
                  props.push({ key: 'status', label: 'Status', value: status, dataType: 'string', componentType: 'input' });
                }
                if (!keys.has('log_stream')) {
                  props.push({ key: 'log_stream', label: 'Log Stream', value: log_stream, dataType: 'string', componentType: 'textarea' });
                }
                return props;
              })()
            }
          });
        }
      } catch { /* ignore malformed events */ }
    });
    es.addEventListener('viewport-updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.viewport) {
          store.dispatch({ type: 'viewport-updated', viewport: data.viewport });
        }
      } catch { /* ignore malformed events */ }
    });
    es.addEventListener('canvas-appearance-updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.canvas_id && data.appearance !== undefined) {
          store.dispatch({ type: 'canvas-appearance-updated', canvas_id: data.canvas_id, appearance: data.appearance });
        }
      } catch { /* ignore malformed events */ }
    });
    es.addEventListener('frontend-action-request', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { action: string; reqId: string; args: any };
        const sendResult = (result: any = {}, error?: string) => {
          fetch(`${mcpUrl}/atomos-structura/tool-result`, {
            method: 'POST',
            body: JSON.stringify({ reqId: data.reqId, result, error })
          }).catch(console.error);
        };
        
        if (data.action === 'structura_undo') {
          store.undo();
          sendResult();
        } else if (data.action === 'structura_redo') {
          store.redo();
          sendResult();
        } else {
          // Dispatch custom event for toolbar/page to handle (SVG export, auto-layout, etc)
          window.dispatchEvent(new CustomEvent('vbs-mcp-action', { 
            detail: { ...data, mcpUrl, sendResult } 
          }));
        }
      } catch { /* ignore malformed events */ }
    });
    es.onerror = () => { /* MCP server may not be running — silent */ };
  } catch { /* EventSource not available or URL invalid */ }

  return {
    cleanup: () => { es?.close(); es = null; },
  };
};

