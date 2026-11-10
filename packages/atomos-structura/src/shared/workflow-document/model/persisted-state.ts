// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReduxState } from '../../types/redux-state.types.js';
import { coerceLegacyWorkspace } from './coerce-legacy-state.js';
import type { DocumentValidationError } from './document.types.js';
import { schemaToDocumentCandidate } from './migrate-v1-workspace.js';
import { validateCanvasDocument } from './validate-document.js';
import { isRecord, type JsonRecord } from './validation-primitives.js';

/** Version stamped on persisted workspace state. '1' is migrated on load. */
export const PERSISTED_STATE_VERSION = '2';

export type PersistedStateResult =
  | { readonly ok: true; readonly state: ReduxState; readonly migratedFrom?: string }
  | { readonly ok: false; readonly errors: readonly DocumentValidationError[] };

const fail = (path: string, message: string): PersistedStateResult => ({
  ok: false,
  errors: [{ path, code: 'invalid-type', message }],
});

const validateSchemas = (workspace: JsonRecord): DocumentValidationError[] => {
  const errors: DocumentValidationError[] = [];
  const canvases = isRecord(workspace['canvases']) ? workspace['canvases'] : {};
  Object.entries(canvases).forEach(([canvasId, canvas]) => {
    if (!isRecord(canvas) || !isRecord(canvas['schemas'])) {
      errors.push({ path: `/workspace/canvases/${canvasId}`, code: 'invalid-type', message: 'Canvas must contain a schemas object' });
      return;
    }
    Object.entries(canvas['schemas']).forEach(([schemaId, schema]) => {
      const base = `/workspace/canvases/${canvasId}/schemas/${schemaId}`;
      const result = validateCanvasDocument(schemaToDocumentCandidate(isRecord(schema) ? schema : {}, canvas['viewport']));
      if (!result.ok) result.errors.forEach(error => errors.push({ ...error, path: `${base}${error.path}` }));
    });
  });
  return errors;
};

/**
 * Parses, migrates and validates persisted workspace state (localStorage).
 * The state is accepted as a whole or rejected as a whole — never partially applied.
 */
export const restorePersistedState = (raw: string): PersistedStateResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { ok: false, errors: [{ path: '', code: 'invalid-json', message: error instanceof Error ? error.message : 'Malformed JSON' }] };
  }
  if (!isRecord(parsed) || !isRecord(parsed['workspace'])) return fail('/workspace', 'Persisted state has no workspace object');
  const source = parsed['workspace'];
  if (!isRecord(source['canvases'])) return fail('/workspace/canvases', 'Persisted workspace has no canvases object');
  const version = typeof source['version'] === 'string' ? source['version'] : '1';
  const workspace = coerceLegacyWorkspace(source);
  const errors = validateSchemas(workspace);
  if (errors.length > 0) return { ok: false, errors };
  const state = { ...parsed, workspace: { ...workspace, version: PERSISTED_STATE_VERSION } } as unknown as ReduxState;
  return version === PERSISTED_STATE_VERSION ? { ok: true, state } : { ok: true, state, migratedFrom: version };
};
