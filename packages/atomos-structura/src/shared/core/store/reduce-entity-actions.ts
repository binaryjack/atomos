// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Cardinality, Entity, LinkProps, RenderType } from '@atomos-web/structura-core';
import type { ReduxAction, ReduxState } from '../../types/redux-state.types.js';
import { portIdsFromAnchors } from '../../workflow-node/model/port-anchor.js';
import { updateActiveCanvas, updateSchemaInCanvas, upsertSchemaInActiveCanvas } from './workspace-defaults.js';

export type ActionHandler<K extends ReduxAction['type']> =
  (state: ReduxState, action: Extract<ReduxAction, { type: K }>) => ReduxState;
export type ActionHandlerMap = { readonly [K in ReduxAction['type']]?: ActionHandler<K> };

const mapEntity = (state: ReduxState, schemaId: string, entityId: string, fn: (e: Entity) => Entity): ReduxState =>
  updateActiveCanvas(state, canvas => updateSchemaInCanvas(canvas, schemaId, schema => ({
    ...schema,
    entities: schema.entities.map(e => (e.id === entityId ? fn(e) : e)),
  })));

const createLink = (action: Extract<ReduxAction, { type: 'link-created' }>): LinkProps => ({
  id: action.link_id || `link-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  leftEntityId: action.from_id,
  rightEntityId: action.to_id,
  leftAnchorId: action.from_anchor || 'center',
  rightAnchorId: action.to_anchor || 'center',
  leftCardinality: (action.leftCardinality || '1') as Cardinality,
  rightCardinality: (action.rightCardinality || '1') as Cardinality,
  ...(action.leftProperty ? { leftProperty: action.leftProperty } : {}),
  ...(action.rightProperty ? { rightProperty: action.rightProperty } : {}),
  ...(action.direction ? { direction: action.direction } : {}),
  ...portIdsFromAnchors(action.from_anchor, action.to_anchor),
  renderType: (action.renderType as RenderType) || 'bezier',
});

/** Re-derives port ids after endpoint changes so links never carry stale port references. */
const withPortIds = (link: LinkProps): LinkProps => {
  const { sourcePortId: _s, targetPortId: _t, ...rest } = link;
  return { ...rest, ...portIdsFromAnchors(link.leftAnchorId, link.rightAnchorId) };
};

export const entityAndLinkHandlers: ActionHandlerMap = {
  'entity-moved': (state, a) => mapEntity(state, a.schema_id, a.entity_id, e => ({ ...e, position: { x: a.x, y: a.y } })),
  'entity-resized': (state, a) =>
    mapEntity(state, a.schema_id, a.entity_id, e => ({ ...e, dimensions: { width: a.width, height: a.height } })),
  'entity-toggled-collapse': (state, a) => mapEntity(state, a.schema_id, a.entity_id, e => ({ ...e, collapsed: a.collapsed })),
  'entity-updated': (state, a) => mapEntity(state, a.schema_id, a.entity.id, () => a.entity),
  'entity-added': (state, a) =>
    upsertSchemaInActiveCanvas(state, a.schema_id, schema => ({ ...schema, entities: [...schema.entities, a.entity] })),
  'entity-removed': (state, a) => updateActiveCanvas(state, canvas => updateSchemaInCanvas(canvas, a.schema_id, schema => ({
    ...schema,
    entities: schema.entities.filter(e => e.id !== a.entity_id),
    links: schema.links.filter(l => l.leftEntityId !== a.entity_id && l.rightEntityId !== a.entity_id),
  }))),
  'schema-replaced': (state, a) =>
    upsertSchemaInActiveCanvas(state, a.schema_id, schema => ({ ...schema, entities: [...a.entities], links: [...a.links] })),
  'link-created': (state, a) =>
    upsertSchemaInActiveCanvas(state, a.schema_id, schema => ({ ...schema, links: [...schema.links, createLink(a)] })),
  'link-updated': (state, a) => updateActiveCanvas(state, canvas => updateSchemaInCanvas(canvas, a.schema_id, schema => ({
    ...schema,
    links: schema.links.map(l => (l.id === a.link.id ? withPortIds({ ...l, ...a.link }) : l)),
  }))),
  'link-removed': (state, a) => updateActiveCanvas(state, canvas => updateSchemaInCanvas(canvas, a.schema_id, schema => ({
    ...schema,
    links: schema.links.filter(l => l.id !== a.link_id),
  }))),
};
