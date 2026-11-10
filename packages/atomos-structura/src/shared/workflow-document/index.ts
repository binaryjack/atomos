// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
export {
  CURRENT_DOCUMENT_SCHEMA_VERSION,
  type DocumentErrorCode,
  type DocumentPoint,
  type DocumentSize,
  type DocumentValidationError,
  type DocumentValidationResult,
  type DocumentViewport,
  type WorkflowCanvasDocument,
  type WorkflowDocumentEdge,
  type WorkflowDocumentNode,
} from './model/document.types.js';
export { parseCanvasDocument, validateCanvasDocument } from './model/validate-document.js';
export { isV1WorkspaceJson, migrateV1Workspace } from './model/migrate-v1-workspace.js';
export {
  documentEdgeToLink,
  documentNodeToEntity,
  entityToDocumentNode,
  linkToDocumentEdge,
} from './model/document-mapping.js';
export { PERSISTED_STATE_VERSION, restorePersistedState, type PersistedStateResult } from './model/persisted-state.js';
