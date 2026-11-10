// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { TypedEmitter } from '../../shared/lib/create-typed-emitter.js';
import type { ReduxStore, SchemaModel } from '../../shared/types/redux-state.types.js';
import type { CanvasEventMap } from '../../shared/workflow-canvas/canvas-events.types.js';
import { getActiveSchema } from '../../shared/workflow-canvas/connection-graph.js';
import { entityToDocumentNode, linkToDocumentEdge } from '../../shared/workflow-document/model/document-mapping.js';

type Snapshot = Pick<SchemaModel, 'entities' | 'links'>;

const EMPTY: Snapshot = { entities: [], links: [] };

const emitNodeChanges = (events: TypedEmitter<CanvasEventMap>, previous: readonly Entity[], next: readonly Entity[]): void => {
  const before = new Map(previous.map(e => [e.id, e]));
  const after = new Map(next.map(e => [e.id, e]));
  after.forEach((entity, id) => {
    const old = before.get(id);
    if (!old) {
      events.emit('node:added', { node: entityToDocumentNode(entity) });
      return;
    }
    if (old !== entity && JSON.stringify(old.config ?? {}) !== JSON.stringify(entity.config ?? {})) {
      events.emit('node:config-changed', { nodeId: id, config: { ...(entity.config ?? {}) }, previous: { ...(old.config ?? {}) } });
    }
  });
  before.forEach((_, id) => { if (!after.has(id)) events.emit('node:removed', { nodeId: id }); });
};

const emitEdgeChanges = (events: TypedEmitter<CanvasEventMap>, previous: readonly LinkProps[], next: readonly LinkProps[]): void => {
  const before = new Set(previous.map(l => l.id));
  const after = new Set(next.map(l => l.id));
  next.forEach(link => { if (!before.has(link.id)) events.emit('edge:added', { edge: linkToDocumentEdge(link) }); });
  previous.forEach(link => { if (!after.has(link.id)) events.emit('edge:removed', { edgeId: link.id }); });
};

/**
 * Derives typed canvas events from store transitions, so every mutation source
 * (UI, undo/redo, import, MCP) is reported uniformly. Returns an unsubscribe function.
 */
export const createStoreEventBridge = (store: ReduxStore, events: TypedEmitter<CanvasEventMap>): (() => void) => {
  let previous: Snapshot = getActiveSchema(store.get_state()) ?? EMPTY;
  let revision = 0;
  return store.subscribe(state => {
    const next: Snapshot = getActiveSchema(state) ?? EMPTY;
    if (next.entities === previous.entities && next.links === previous.links) return;
    const before = previous;
    previous = next;
    emitNodeChanges(events, before.entities, next.entities);
    emitEdgeChanges(events, before.links, next.links);
    revision += 1;
    events.emit('change', { revision });
  });
};
