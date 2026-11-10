// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { parsePortAnchorId } from '../../workflow-node/model/port-anchor.js';
import { CURRENT_DOCUMENT_SCHEMA_VERSION } from './document.types.js';
import { isRecord, type JsonRecord } from './validation-primitives.js';

/** Returns the `workspace` object of a v1 persisted state (with or without the Redux wrapper). */
const unwrapWorkspace = (input: unknown): JsonRecord | null => {
  if (!isRecord(input)) return null;
  const candidate = isRecord(input['workspace']) ? input['workspace'] : input;
  return isRecord(candidate['canvases']) ? candidate : null;
};

/** True when the input looks like a v1 workspace JSON (Redux state or bare workspace). */
export const isV1WorkspaceJson = (input: unknown): boolean => {
  if (isRecord(input) && 'schemaVersion' in input) return false;
  return unwrapWorkspace(input) !== null;
};

const pick = (source: JsonRecord, keys: readonly string[]): JsonRecord => {
  const out: JsonRecord = {};
  keys.forEach(key => { if (source[key] !== undefined) out[key] = source[key]; });
  return out;
};

const entityToCandidate = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  return {
    ...pick(raw, ['id', 'position', 'properties', 'shape', 'color', 'description', 'collapsed', 'config', 'metadata', 'ports']),
    ...(typeof raw['nodeType'] === 'string' ? { type: raw['nodeType'] } : {}),
    label: typeof raw['name'] === 'string' ? raw['name'] : raw['id'],
    size: raw['dimensions'],
  };
};

const linkToCandidate = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  const leftAnchor = typeof raw['leftAnchorId'] === 'string' ? raw['leftAnchorId'] : undefined;
  const rightAnchor = typeof raw['rightAnchorId'] === 'string' ? raw['rightAnchorId'] : undefined;
  const sourcePortId = raw['sourcePortId'] ?? parsePortAnchorId(leftAnchor)?.portId;
  const targetPortId = raw['targetPortId'] ?? parsePortAnchorId(rightAnchor)?.portId;
  return {
    ...pick(raw, ['id', 'renderType', 'direction']),
    source: raw['leftEntityId'],
    target: raw['rightEntityId'],
    ...(leftAnchor ? { sourceAnchorId: leftAnchor } : {}),
    ...(rightAnchor ? { targetAnchorId: rightAnchor } : {}),
    ...(sourcePortId !== undefined ? { sourcePortId } : {}),
    ...(targetPortId !== undefined ? { targetPortId } : {}),
    ...(raw['leftCardinality'] !== undefined ? { sourceCardinality: raw['leftCardinality'] } : {}),
    ...(raw['rightCardinality'] !== undefined ? { targetCardinality: raw['rightCardinality'] } : {}),
    ...(raw['leftProperty'] !== undefined ? { sourceProperty: raw['leftProperty'] } : {}),
    ...(raw['rightProperty'] !== undefined ? { targetProperty: raw['rightProperty'] } : {}),
  };
};

const viewportToCandidate = (raw: unknown): JsonRecord => {
  if (!isRecord(raw)) return { x: 0, y: 0, zoom: 1 };
  const pan = isRecord(raw['pan']) ? raw['pan'] : { x: raw['panX'], y: raw['panY'] };
  const x = Number(pan['x']);
  const y = Number(pan['y']);
  const zoom = Number(raw['zoom']);
  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
  };
};

/**
 * Converts the active schema of a v1 workspace JSON into a v2 document candidate.
 * The result is NOT trusted: callers must run it through `validateCanvasDocument`.
 */
export const migrateV1Workspace = (input: unknown): JsonRecord => {
  const workspace = unwrapWorkspace(input) ?? {};
  const canvases = isRecord(workspace['canvases']) ? workspace['canvases'] : {};
  const activeCanvasId = String(workspace['active_canvas_id'] ?? Object.keys(canvases)[0] ?? '');
  const canvas = isRecord(canvases[activeCanvasId]) ? canvases[activeCanvasId] : {};
  const schemas = isRecord(canvas['schemas']) ? canvas['schemas'] : {};
  const schemaId = String(canvas['active_schema_id'] ?? Object.keys(schemas)[0] ?? '');
  const schema = isRecord(schemas[schemaId]) ? schemas[schemaId] : {};
  return schemaToDocumentCandidate(schema, canvas['viewport']);
};

/** Maps one stored schema (`{ entities, links }`) to an untrusted v2 document candidate. */
export const schemaToDocumentCandidate = (schema: JsonRecord, viewport: unknown): JsonRecord => {
  const entities = Array.isArray(schema['entities']) ? schema['entities'] : [];
  const links = Array.isArray(schema['links']) ? schema['links'] : [];
  return {
    schemaVersion: CURRENT_DOCUMENT_SCHEMA_VERSION,
    nodes: entities.map(entityToCandidate),
    edges: links.map(linkToCandidate),
    viewport: viewportToCandidate(viewport),
  };
};
