// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { parseCanvasDocument, validateCanvasDocument } from '../src/shared/workflow-document/model/validate-document.js';
import { restorePersistedState } from '../src/shared/workflow-document/model/persisted-state.js';
import { layoutPorts } from '../src/shared/workflow-node/model/port-layout.js';
import { parsePortAnchorId, toPortAnchorId } from '../src/shared/workflow-node/model/port-anchor.js';

const node = (id: string, ports: unknown[] = []) => ({
  id, type: 'task', label: id, position: { x: 0, y: 0 }, size: { width: 160, height: 80 }, ports,
});
const outPort = { id: 'out', direction: 'out', dataType: 'json' };
const inPort = { id: 'in', direction: 'in', dataType: 'json' };
const validDoc = {
  schemaVersion: 2,
  nodes: [node('a', [outPort]), node('b', [inPort])],
  edges: [{ id: 'e1', source: 'a', target: 'b', sourcePortId: 'out', targetPortId: 'in' }],
  viewport: { x: 0, y: 0, zoom: 1 },
};

const v1Workspace = {
  workspace: {
    version: '1',
    active_canvas_id: 'c1',
    canvases: {
      c1: {
        active_schema_id: 's1',
        viewport: { pan: { x: '10', y: 20 }, zoom: 2 },
        schemas: {
          s1: {
            entities: [
              { id: 'a', name: 'A', nodeType: 'task', properties: [], position: { x: 1, y: 2 }, dimensions: { width: 100, height: 50 }, ports: [outPort] },
              { id: 'b', name: 'B', properties: [], position: { x: 3, y: 4 }, dimensions: { width: 100, height: 50 }, ports: [inPort] },
            ],
            links: [{ id: 'l1', leftEntityId: 'a', rightEntityId: 'b', leftAnchorId: 'a::out', rightAnchorId: 'b::in', leftCardinality: '1', rightCardinality: '1', renderType: 'bezier' }],
          },
        },
      },
    },
  },
};

describe('workflow document validation', () => {
  it('accepts a well-formed v2 document', () => {
    const result = validateCanvasDocument(validDoc);
    expect(result.ok).toBe(true);
  });

  it('rejects malformed documents with typed errors and no partial result', () => {
    const result = validateCanvasDocument({
      ...validDoc,
      nodes: [node('a', [outPort]), { id: 'a', position: { x: 'x' } }],
      edges: [{ id: 'e1', source: 'a', target: 'ghost', sourcePortId: 'missing' }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain('invalid-type');
    expect(codes).toContain('dangling-edge');
    expect(codes).toContain('unknown-port');
    expect('document' in result).toBe(false);
  });

  it('rejects unsupported versions and invalid JSON', () => {
    expect(validateCanvasDocument({ ...validDoc, schemaVersion: 4 })).toMatchObject({ ok: false });
    expect(validateCanvasDocument({ ...validDoc, schemaVersion: 3 })).toMatchObject({ ok: true });
    expect(validateCanvasDocument(validDoc)).toMatchObject({ ok: true, migratedFrom: 2, document: { schemaVersion: 3 } });
    const bad = parseCanvasDocument('{not json');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors[0]?.code).toBe('invalid-json');
  });

  it('migrates v1 workspace JSON to a v2 document', () => {
    const result = parseCanvasDocument(JSON.stringify(v1Workspace));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migratedFrom).toBe(1);
    expect(result.document.viewport).toEqual({ x: 10, y: 20, zoom: 2 });
    expect(result.document.nodes[0]).toMatchObject({ id: 'a', type: 'task', label: 'A' });
    expect(result.document.edges[0]).toMatchObject({ source: 'a', target: 'b', sourcePortId: 'out', targetPortId: 'in' });
  });
});

describe('persisted state restore', () => {
  it('migrates v1 persisted state to version 2 with explicit port ids', () => {
    const result = restorePersistedState(JSON.stringify(v1Workspace));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migratedFrom).toBe('1');
    expect(result.state.workspace.version).toBe('2');
    const link = result.state.workspace.canvases['c1']?.schemas['s1']?.links[0];
    expect(link).toMatchObject({ sourcePortId: 'out', targetPortId: 'in' });
  });

  it('rejects corrupt persisted state as a whole', () => {
    const corrupt = JSON.parse(JSON.stringify(v1Workspace));
    corrupt.workspace.canvases.c1.schemas.s1.links[0].rightEntityId = 'ghost';
    expect(restorePersistedState(JSON.stringify(corrupt)).ok).toBe(false);
    expect(restorePersistedState('{"flat":true}').ok).toBe(false);
  });
});

describe('port geometry', () => {
  it('round-trips port anchor ids', () => {
    expect(toPortAnchorId('node-1', 'out')).toBe('node-1::out');
    expect(parsePortAnchorId('node-1::out')).toEqual({ nodeId: 'node-1', portId: 'out' });
    expect(parsePortAnchorId('node-1-anchor-right')).toBeNull();
  });

  it('places inputs left and outputs right, evenly spaced', () => {
    const placements = layoutPorts(
      [{ id: 'i1', direction: 'in', dataType: 'any' }, { id: 'i2', direction: 'in', dataType: 'any' }, { id: 'o1', direction: 'out', dataType: 'any' }],
      { width: 200, height: 90 }
    );
    expect(placements.map(p => [p.port.id, p.edge, p.local.x, p.local.y])).toEqual([
      ['i1', 'left', 0, 30], ['i2', 'left', 0, 60], ['o1', 'right', 200, 45],
    ]);
  });
});
