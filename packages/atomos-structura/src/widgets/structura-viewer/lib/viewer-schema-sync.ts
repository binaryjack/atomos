// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DAGExchange } from '../../../shared/core/application/dag-service.js';
import { createStructuraViewer } from '../create-structura-viewer.js';
import type { ViewerEntityPatch } from './patch-viewer-entity.js';

export { createStructuraViewer };
export type { ViewerEntityPatch, ViewerExecutionPatch } from './patch-viewer-entity.js';

type ViewerEngine = ReturnType<typeof createStructuraViewer>;

/** Identity of the graph structure: node ids and edge endpoints (order-insensitive). */
export const structureSignature = (dag: DAGExchange): string => {
  const nodes = (dag.nodes ?? []).map(n => n.id).sort();
  const edges = (dag.edges ?? [])
    .map(e => [e.id, e.sourceEntityId, e.targetEntityId, e.sourceAnchorId, e.targetAnchorId].join('|'))
    .sort();
  return JSON.stringify([nodes, edges]);
};

const nodePatch = (node: DAGExchange['nodes'][number]): ViewerEntityPatch => {
  const extra = node as typeof node & { readonly execution?: Readonly<Record<string, unknown>> };
  return {
    metadata: {
      name: node.name,
      properties: node.properties,
      ...(node.shape !== undefined ? { shape: node.shape } : {}),
      ...(node.color !== undefined ? { color: node.color } : {}),
    },
    ...(extra.execution ? { execution: extra.execution } : {}),
  };
};

/**
 * Applies a new schema to a viewer: a full rebuild only when the structure (nodes / edges)
 * changed, otherwise an incremental patch of node metadata and execution state.
 */
export const syncViewerSchema = (engine: ViewerEngine, previous: DAGExchange | null, next: DAGExchange): void => {
  if (!previous || structureSignature(previous) !== structureSignature(next)) {
    engine.loadSchema(next);
    return;
  }
  next.nodes.forEach(node => engine.patchEntity(node.id, nodePatch(node)));
};
