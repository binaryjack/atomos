// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type * as Y from 'yjs';
import {
  CURRENT_DOCUMENT_SCHEMA_VERSION, type DocumentViewport, type WorkflowCanvasDocument,
  type WorkflowDocumentEdge, type WorkflowDocumentNode,
} from '../../shared/workflow-document/model/document.types.js';

/** Shared structure: `nodes` and `edges` are Y.Maps keyed by id holding JSON values. */
export interface SharedGraph {
  readonly nodes: Y.Map<unknown>;
  readonly edges: Y.Map<unknown>;
}

export const sharedGraphOf = (ydoc: Y.Doc): SharedGraph => ({
  nodes: ydoc.getMap<unknown>('structura.nodes'),
  edges: ydoc.getMap<unknown>('structura.edges'),
});

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Plain JSON copy (drops undefined fields so Yjs can encode it). */
const toJson = <T>(value: T): unknown => JSON.parse(JSON.stringify(value));

const syncMap = <T extends { readonly id: string }>(map: Y.Map<unknown>, items: readonly T[]): void => {
  const ids = new Set(items.map(item => item.id));
  Array.from(map.keys()).forEach(id => { if (!ids.has(id)) map.delete(id); });
  items.forEach(item => {
    const json = toJson(item);
    if (!sameJson(map.get(item.id), json)) map.set(item.id, json);
  });
};

/** Writes the local document into the shared maps (only changed entries are touched). */
export const writeDocumentToShared = (graph: SharedGraph, doc: WorkflowCanvasDocument): void => {
  syncMap(graph.nodes, doc.nodes);
  syncMap(graph.edges, doc.edges);
};

/** True when the shared maps already describe exactly this document's nodes and edges. */
export const sharedMatches = (graph: SharedGraph, doc: WorkflowCanvasDocument): boolean =>
  graph.nodes.size === doc.nodes.length && graph.edges.size === doc.edges.length
  && doc.nodes.every(n => sameJson(graph.nodes.get(n.id), toJson(n)))
  && doc.edges.every(e => sameJson(graph.edges.get(e.id), toJson(e)));

/** Untrusted document candidate rebuilt from the shared maps (validated by importDocument). */
export const readSharedDocument = (graph: SharedGraph, viewport: DocumentViewport): WorkflowCanvasDocument => ({
  schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
  nodes: Array.from(graph.nodes.values()) as WorkflowDocumentNode[],
  edges: Array.from(graph.edges.values()) as WorkflowDocumentEdge[],
  viewport,
});
