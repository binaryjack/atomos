// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import { isNodeStatus, type NodeState, type NodeStatus } from '../../shared/workflow-node/model/node-state.types.js';

export interface McpChangePayload {
  readonly schema_id?: string;
  readonly entities: readonly Entity[];
  readonly links: readonly LinkProps[];
}

/** Runs `fn` as one undo step when the store supports transactions. */
export const inStoreTransaction = (store: ReduxStore, label: string, fn: () => void): void => {
  if (typeof store.transaction === 'function') store.transaction(label, fn);
  else fn();
};

const linkCreatedAction = (schemaId: string, l: LinkProps) => ({
  type: 'link-created' as const,
  schema_id: schemaId,
  link_id: l.id,
  from_id: l.leftEntityId,
  to_id: l.rightEntityId,
  from_anchor: l.leftAnchorId,
  to_anchor: l.rightAnchorId,
  leftCardinality: l.leftCardinality,
  rightCardinality: l.rightCardinality,
});

/**
 * Applies a full-schema snapshot pushed by the MCP server: entities and links are added,
 * updated or removed so the store matches the payload exactly (one undo step).
 */
export const applyMcpChange = (store: ReduxStore, data: McpChangePayload): void => {
  const state = store.get_state();
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  const schemaId = data.schema_id ?? canvas?.active_schema_id ?? '';
  const schema = canvas?.schemas[schemaId];
  const knownEntities = new Set((schema?.entities ?? []).map(e => e.id));
  const knownLinks = new Set((schema?.links ?? []).map(l => l.id));
  const incomingEntities = new Set(data.entities.map(e => e.id));
  const incomingLinks = new Set(data.links.map(l => l.id));
  inStoreTransaction(store, 'Remote change', () => {
    data.entities.forEach(entity => store.dispatch({
      type: knownEntities.has(entity.id) ? 'entity-updated' : 'entity-added', schema_id: schemaId, entity,
    }));
    (schema?.entities ?? []).forEach(e => {
      if (!incomingEntities.has(e.id)) store.dispatch({ type: 'entity-removed', schema_id: schemaId, entity_id: e.id });
    });
    data.links.forEach(link => store.dispatch(knownLinks.has(link.id)
      ? { type: 'link-updated', schema_id: schemaId, link }
      : linkCreatedAction(schemaId, link)));
    (schema?.links ?? []).forEach(l => {
      if (!incomingLinks.has(l.id)) store.dispatch({ type: 'link-removed', schema_id: schemaId, link_id: l.id });
    });
  });
};

const STATUS_ALIASES: Readonly<Record<string, NodeStatus>> = {
  success: 'succeeded', completed: 'succeeded', done: 'succeeded', error: 'failed', pending: 'queued', in_progress: 'running',
};

/** Maps an MCP `node-progress` payload to an overlay NodeState. */
export const toNodeState = (payload: { status?: unknown; label?: unknown; progress?: unknown; log_stream?: unknown }): NodeState => {
  const raw = typeof payload.status === 'string' ? payload.status.toLowerCase() : 'idle';
  const status: NodeStatus = isNodeStatus(raw) ? raw : STATUS_ALIASES[raw] ?? 'idle';
  const label = typeof payload.label === 'string' ? payload.label
    : typeof payload.log_stream === 'string' ? payload.log_stream.split('\n').filter(Boolean).pop() : undefined;
  return {
    status,
    ...(label !== undefined ? { label } : {}),
    ...(typeof payload.progress === 'number' ? { progress: payload.progress } : {}),
  };
};
