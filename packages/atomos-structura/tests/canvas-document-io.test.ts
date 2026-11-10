// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import { exportCanvasDocument, importCanvasDocument } from '../src/features/workflow-document-io/canvas-document-io.js';
import { create_redux_store } from '../src/shared/core/create-redux-store.js';
import { getActiveSchema } from '../src/shared/workflow-canvas/connection-graph.js';

const doc = {
  schemaVersion: 2,
  nodes: [
    { id: 'a', type: 'task', label: 'A', position: { x: 1, y: 2 }, size: { width: 200, height: 100 }, config: { n: 1 }, metadata: {}, ports: [{ id: 'out', direction: 'out', dataType: 'json' }] },
    { id: 'b', type: 'task', label: 'B', position: { x: 300, y: 2 }, size: { width: 200, height: 100 }, config: {}, metadata: { m: true }, ports: [{ id: 'in', direction: 'in', dataType: 'json' }] },
  ],
  edges: [{ id: 'e', source: 'a', target: 'b', sourcePortId: 'out', targetPortId: 'in' }],
  viewport: { x: 10, y: 20, zoom: 1.5 },
};

const newStore = (id: string) => create_redux_store({ instanceId: id, config: { persistence: false } });

describe('exportDocument / importDocument', () => {
  it('imports atomically as one undo step and round-trips through export', () => {
    const store = newStore('doc-1');
    const applied = vi.fn();
    const result = importCanvasDocument(store, doc, applied);
    expect(result.ok).toBe(true);
    expect(applied).toHaveBeenCalledOnce();
    const exported = exportCanvasDocument(store);
    expect(exported.schemaVersion).toBe(3);
    expect(result).toMatchObject({ migratedFrom: 2 });
    expect(exported.viewport).toEqual({ x: 10, y: 20, zoom: 1.5 });
    expect(exported.nodes.map(n => [n.id, n.type, n.config, n.metadata])).toEqual([['a', 'task', { n: 1 }, {}], ['b', 'task', {}, { m: true }]]);
    expect(exported.edges[0]).toMatchObject({ source: 'a', target: 'b', sourcePortId: 'out', targetPortId: 'in', sourceAnchorId: 'a::out' });
    store.undo();
    expect(getActiveSchema(store.get_state())?.entities).toHaveLength(0);
  });

  it('rejects malformed documents without applying anything', () => {
    const store = newStore('doc-2');
    const before = store.get_state();
    const applied = vi.fn();
    const result = importCanvasDocument(store, { ...doc, edges: [{ id: 'e', source: 'a', target: 'ghost' }] }, applied);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatchObject({ code: 'dangling-edge', path: '/edges/0/target' });
    expect(store.get_state()).toBe(before);
    expect(applied).not.toHaveBeenCalled();
  });

  it('migrates v1 workspace JSON on import', () => {
    const store = newStore('doc-3');
    const v1 = {
      workspace: {
        version: '1', active_canvas_id: 'c',
        canvases: { c: { active_schema_id: 's', viewport: { panX: 3, panY: 4, zoom: 1 }, schemas: { s: {
          entities: [{ id: 'u', name: 'User', properties: [], position: { x: 0, y: 0 }, dimensions: { width: 100, height: 50 } }],
          links: [],
        } } } },
      },
    };
    const result = importCanvasDocument(store, JSON.stringify(v1), vi.fn());
    expect(result).toMatchObject({ ok: true, migratedFrom: 1 });
    expect(exportCanvasDocument(store).nodes[0]).toMatchObject({ id: 'u', label: 'User' });
    expect(exportCanvasDocument(store).viewport).toEqual({ x: 3, y: 4, zoom: 1 });
  });
});
