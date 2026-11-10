// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxStore } from '../../shared/types/redux-state.types.js';
import { getActiveSchema } from '../../shared/workflow-canvas/connection-graph.js';
import {
  CURRENT_DOCUMENT_SCHEMA_VERSION, type DocumentValidationResult, type WorkflowCanvasDocument,
} from '../../shared/workflow-document/model/document.types.js';
import {
  documentEdgeToLink, documentNodeToEntity, documentToViewport, entityToDocumentNode, linkToDocumentEdge, viewportToDocument,
} from '../../shared/workflow-document/model/document-mapping.js';
import { parseCanvasDocument } from '../../shared/workflow-document/model/validate-document.js';

/** Serializes the active schema as a versioned (schemaVersion 2) canvas document. */
export const exportCanvasDocument = (store: ReduxStore): WorkflowCanvasDocument => {
  const state = store.get_state();
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  const schema = getActiveSchema(state);
  return {
    schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
    nodes: (schema?.entities ?? []).map(entityToDocumentNode),
    edges: (schema?.links ?? []).map(linkToDocumentEdge),
    viewport: viewportToDocument(canvas?.viewport),
  };
};

/**
 * Validates (and migrates v1 workspace JSON) then replaces the active schema atomically,
 * as ONE undo step. On any validation error nothing is applied and the typed errors are returned.
 */
export const importCanvasDocument = (
  store: ReduxStore, input: unknown, onApplied: (document: WorkflowCanvasDocument) => void
): DocumentValidationResult => {
  const result = parseCanvasDocument(input);
  if (!result.ok) return result;
  const state = store.get_state();
  const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
  const schemaId = canvas?.active_schema_id ?? 'schema-default';
  const now = Date.now();
  store.transaction('Import document', () => {
    store.dispatch({
      type: 'schema-replaced',
      schema_id: schemaId,
      entities: result.document.nodes.map(node => documentNodeToEntity(node, now)),
      links: result.document.edges.map(documentEdgeToLink),
    });
  });
  store.dispatch({ type: 'viewport-updated', viewport: documentToViewport(result.document.viewport) });
  onApplied(result.document);
  return result;
};
