// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { getInstanceReduxStore } from '../core/create-redux-store.js';
import { getCanvasRuntime } from './canvas-runtime.js';
import { anchorToPortRef, buildConnectionGraph, getActiveSchema } from './connection-graph.js';
import type { ConnectionVerdict } from './connection-validation.types.js';
import { validateConnection } from './validate-connection.js';

export interface ConnectionEndpoint {
  readonly entityId: string;
  readonly anchorId: string;
}

/**
 * Evaluates a prospective link against the instance's current graph, built-in checks,
 * options and custom validator. Pure preview: emits nothing.
 */
export const previewConnection = (
  instanceId: string, source: ConnectionEndpoint, target: ConnectionEndpoint, ignoreLinkId?: string
): ConnectionVerdict => {
  const runtime = getCanvasRuntime(instanceId);
  const schema = getActiveSchema(getInstanceReduxStore(instanceId).get_state());
  const graph = buildConnectionGraph(schema && ignoreLinkId
    ? { entities: schema.entities, links: schema.links.filter(l => l.id !== ignoreLinkId) }
    : schema);
  return validateConnection(
    anchorToPortRef(source.entityId, source.anchorId),
    anchorToPortRef(target.entityId, target.anchorId),
    graph,
    runtime.connectionOptions,
    runtime.validator ?? undefined,
  );
};

/**
 * Gate used right before a link is created. Rejections emit `connection:rejected`
 * on the canvas event bus and the link is never created.
 */
export const gateConnection = (
  instanceId: string, source: ConnectionEndpoint, target: ConnectionEndpoint, ignoreLinkId?: string
): ConnectionVerdict => {
  const verdict = previewConnection(instanceId, source, target, ignoreLinkId);
  if (!verdict.ok) {
    getCanvasRuntime(instanceId).events.emit('connection:rejected', {
      source: anchorToPortRef(source.entityId, source.anchorId),
      target: anchorToPortRef(target.entityId, target.anchorId),
      reason: verdict.reason,
    });
  }
  return verdict;
};
