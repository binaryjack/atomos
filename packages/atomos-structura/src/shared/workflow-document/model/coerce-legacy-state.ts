// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { portIdsFromAnchors } from '../../workflow-node/model/port-anchor.js';
import { isRecord, type JsonRecord } from './validation-primitives.js';

const clamp = (value: number, limit: number): number => (value < -limit || value > limit ? 0 : value);

/**
 * Legacy data often stored numbers as strings, causing string concatenation during
 * pan math. Coerces the viewport into `{ zoom, pan: { x, y } }` with sane bounds.
 */
const coerceViewport = (raw: unknown): JsonRecord => {
  const vp = isRecord(raw) ? raw : {};
  const pan = isRecord(vp['pan']) ? vp['pan'] : { x: vp['panX'], y: vp['panY'] };
  const zoom = Number(vp['zoom']);
  return {
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    pan: { x: clamp(Number(pan['x']) || 0, 20000), y: clamp(Number(pan['y']) || 0, 20000) },
  };
};

const coerceEntity = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  const position = isRecord(raw['position']) ? raw['position'] : {};
  const dimensions = isRecord(raw['dimensions']) ? raw['dimensions'] : {};
  return {
    ...raw,
    position: { x: clamp(Number(position['x']) || 0, 10000), y: clamp(Number(position['y']) || 0, 10000) },
    dimensions: { width: Number(dimensions['width']) || 200, height: Number(dimensions['height']) || 100 },
    properties: Array.isArray(raw['properties']) ? raw['properties'] : [],
    edges: Array.isArray(raw['edges']) ? raw['edges'] : [],
  };
};

/** v1 -> v2: links connecting typed ports carry explicit `sourcePortId` / `targetPortId`. */
const migrateLink = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  const left = typeof raw['leftAnchorId'] === 'string' ? raw['leftAnchorId'] : undefined;
  const right = typeof raw['rightAnchorId'] === 'string' ? raw['rightAnchorId'] : undefined;
  return { ...portIdsFromAnchors(left, right), ...raw };
};

const coerceSchema = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  return {
    ...raw,
    entities: Array.isArray(raw['entities']) ? raw['entities'].map(coerceEntity) : [],
    links: Array.isArray(raw['links']) ? raw['links'].map(migrateLink) : [],
  };
};

const mapRecord = (raw: unknown, fn: (value: unknown) => unknown): JsonRecord => {
  if (!isRecord(raw)) return {};
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, fn(value)]));
};

const coerceCanvas = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  return { ...raw, viewport: coerceViewport(raw['viewport']), schemas: mapRecord(raw['schemas'], coerceSchema) };
};

/** Returns a coerced copy of a persisted workspace object. Never mutates the input. */
export const coerceLegacyWorkspace = (workspace: JsonRecord): JsonRecord => ({
  ...workspace,
  canvases: mapRecord(workspace['canvases'], coerceCanvas),
});
