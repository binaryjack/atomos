import type { Entity, LinkProps } from '@atomos/structura-core';
import type { ReduxStore } from '../../types/redux-state.types.js';

export interface McpSyncResult {
  readonly cleanup: () => void;
}

export const createMcpSync = (
  store: ReduxStore,
  mcpUrl = 'http://localhost:3001',
): McpSyncResult => {
  let es: EventSource | null = null;
  let syncing = false;

  const applyChange = (data: { entities: Entity[]; links: LinkProps[] }): void => {
    if (syncing) return;
    syncing = true;
    try {
      const st = store.get_state();
      const schemaId = st.active_schema_id;
      const schema = st.schemas[schemaId];
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

  try {
    es = new EventSource(`${mcpUrl}/events`);
    es.addEventListener('change', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { entities: Entity[]; links: LinkProps[] };
        applyChange(data);
      } catch { /* ignore malformed events */ }
    });
    es.onerror = () => { /* MCP server may not be running — silent */ };
  } catch { /* EventSource not available or URL invalid */ }

  return {
    cleanup: () => { es?.close(); es = null; },
  };
};
