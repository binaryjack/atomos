// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  CURRENT_DOCUMENT_SCHEMA_VERSION,
  type DocumentValidationResult,
  type DocumentViewport,
  type WorkflowDocumentEdge,
  type WorkflowDocumentNode,
} from './document.types.js';
import { isV1WorkspaceJson, migrateV1Workspace } from './migrate-v1-workspace.js';
import { checkEdgeReferences, validateEdge } from './validate-edge.js';
import { validateNode } from './validate-node.js';
import { createErrorSink, type ErrorSink, isRecord, report, requireArray, requireNumber } from './validation-primitives.js';

const validateViewport = (sink: ErrorSink, raw: unknown): DocumentViewport => {
  if (raw === undefined) return { x: 0, y: 0, zoom: 1 };
  if (!isRecord(raw)) {
    report(sink, '/viewport', 'invalid-type', 'Expected a viewport object');
    return { x: 0, y: 0, zoom: 1 };
  }
  const x = requireNumber(sink, raw, 'x', '/viewport') ?? 0;
  const y = requireNumber(sink, raw, 'y', '/viewport') ?? 0;
  const zoom = requireNumber(sink, raw, 'zoom', '/viewport') ?? 1;
  if (zoom <= 0) report(sink, '/viewport/zoom', 'invalid-value', 'Zoom must be strictly positive');
  return { x, y, zoom };
};

const collectUnique = <T extends { readonly id: string }>(
  sink: ErrorSink, items: readonly (T | undefined)[], collection: string
): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  items.forEach((item, index) => {
    if (!item) return;
    if (seen.has(item.id)) {
      report(sink, `/${collection}/${index}/id`, 'duplicate-id', `Duplicate ${collection} id '${item.id}'`);
      return;
    }
    seen.add(item.id);
    out.push(item);
  });
  return out;
};

/**
 * Validates a v2 canvas document. Never throws, never partially accepts:
 * either the full normalized document is returned or the complete error list.
 */
export const validateCanvasDocument = (input: unknown): DocumentValidationResult => {
  const sink = createErrorSink();
  if (!isRecord(input)) {
    return { ok: false, errors: [{ path: '', code: 'invalid-type', message: 'Document must be a JSON object' }] };
  }
  if (input['schemaVersion'] !== CURRENT_DOCUMENT_SCHEMA_VERSION) {
    const message = `Unsupported schemaVersion '${String(input['schemaVersion'])}', expected ${CURRENT_DOCUMENT_SCHEMA_VERSION}`;
    return { ok: false, errors: [{ path: '/schemaVersion', code: 'unsupported-version', message }] };
  }
  const rawNodes = requireArray(sink, input, 'nodes', '');
  const rawEdges = requireArray(sink, input, 'edges', '');
  const nodes = collectUnique<WorkflowDocumentNode>(sink, rawNodes.map((n, i) => validateNode(sink, n, `/nodes/${i}`)), 'nodes');
  const edges = collectUnique<WorkflowDocumentEdge>(sink, rawEdges.map((e, i) => validateEdge(sink, e, `/edges/${i}`)), 'edges');
  const viewport = validateViewport(sink, input['viewport']);
  checkEdgeReferences(sink, edges, new Map(nodes.map(node => [node.id, node])));
  if (sink.errors.length > 0) return { ok: false, errors: sink.errors };
  return { ok: true, document: { schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION, nodes, edges, viewport } };
};

/**
 * Accepts a JSON string or object; migrates v1 workspace JSON to v2, then validates.
 */
export const parseCanvasDocument = (input: unknown): DocumentValidationResult => {
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Malformed JSON';
      return { ok: false, errors: [{ path: '', code: 'invalid-json', message }] };
    }
  }
  if (isV1WorkspaceJson(value)) {
    const result = validateCanvasDocument(migrateV1Workspace(value));
    return result.ok ? { ...result, migratedFrom: 1 } : result;
  }
  return validateCanvasDocument(value);
};
