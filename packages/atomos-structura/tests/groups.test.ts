// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { PortSpec } from '@atomos-web/structura-core';
import { createGroupCommands } from '../src/features/workflow-canvas/create-group-commands.js';
import { createNodeCommands } from '../src/features/workflow-canvas/create-node-commands.js';
import { exportCanvasDocument, importCanvasDocument } from '../src/features/workflow-document-io/canvas-document-io.js';
import { runElkLayout } from '../src/shared/core/application/layout/elk-layered-layout.js';
import { getInstanceReduxStore } from '../src/shared/core/create-redux-store.js';
import { getEntityManager } from '../src/shared/core/presentation/entity-manager.js';
import { getCanvasRuntime } from '../src/shared/workflow-canvas/canvas-runtime.js';
import { getActiveSchema } from '../src/shared/workflow-canvas/connection-graph.js';
import { descendantsOf, visibleEndpoint } from '../src/shared/workflow-canvas/group-model.js';
import { validateCanvasDocument } from '../src/shared/workflow-document/model/validate-document.js';

const ports: PortSpec[] = [{ id: 'in', direction: 'in', dataType: 'any' }, { id: 'out', direction: 'out', dataType: 'any' }];

const setup = (instanceId: string) => {
  const store = getInstanceReduxStore(instanceId, { persistence: false });
  const runtime = getCanvasRuntime(instanceId);
  runtime.nodeTypes.register({ type: 'task', label: 'Task', ports });
  const reconcile = vi.fn();
  const nodes = createNodeCommands(instanceId, store, runtime, reconcile);
  const groups = createGroupCommands(instanceId, store, reconcile);
  ['ext', 'a', 'b'].forEach((id, i) => nodes.addNode({ type: 'task', id, position: { x: i * 260, y: 40 } }));
  nodes.connect({ nodeId: 'ext', portId: 'out' }, { nodeId: 'a', portId: 'in' });
  nodes.connect({ nodeId: 'a', portId: 'out' }, { nodeId: 'b', portId: 'in' });
  return { store, nodes, groups };
};

const entities = (instanceId: string) => getActiveSchema(getInstanceReduxStore(instanceId).get_state())?.entities ?? [];
const find = (instanceId: string, id: string) => entities(instanceId).find(e => e.id === id);

describe('group containers', () => {
  it('wraps nodes in a group sized to their bounds, as one undo step', () => {
    const { store, groups } = setup('grp-1');
    const groupId = groups.createGroup(['a', 'b'], 'Payment');
    const group = find('grp-1', groupId);
    expect(group).toMatchObject({ nodeType: 'group', name: 'Payment' });
    expect(find('grp-1', 'a')?.parentId).toBe(groupId);
    expect(descendantsOf(entities('grp-1'), groupId).sort()).toEqual(['a', 'b']);
    expect(group?.position.x).toBeLessThan(260);
    store.undo();
    expect(find('grp-1', groupId)).toBeUndefined();
    expect(find('grp-1', 'a')?.parentId).toBeUndefined();
  });

  it('rejects non-group parents and containment cycles', () => {
    const { groups, nodes } = setup('grp-2');
    expect(() => groups.setNodeParent('a', 'b')).toThrow(/not a group/);
    const outer = groups.createGroup(['a']);
    const inner = nodes.addNode({ type: 'group', id: 'inner', position: { x: 0, y: 0 }, parentId: outer });
    expect(() => groups.setNodeParent(outer, inner)).toThrow(/cycle/);
  });

  it('collapses to boundary proxy ports and expands back', () => {
    const { groups } = setup('grp-3');
    const groupId = groups.createGroup(['a', 'b']);
    const expanded = find('grp-3', groupId)?.dimensions;
    groups.setGroupCollapsed(groupId, true);
    const collapsed = find('grp-3', groupId);
    expect(collapsed?.collapsed).toBe(true);
    expect(collapsed?.ports).toEqual([expect.objectContaining({ id: 'proxy-in.a.in', direction: 'in' })]);
    expect(visibleEndpoint(entities('grp-3'), 'a', 'a::in', 'in')).toEqual({ entityId: groupId, anchorId: `${groupId}::proxy-in.a.in` });
    groups.setGroupCollapsed(groupId, false);
    expect(find('grp-3', groupId)).toMatchObject({ collapsed: false, ports: [], dimensions: expanded });
  });

  it('round-trips parentId through schemaVersion 3 documents and validates containment', () => {
    const { store, groups } = setup('grp-4');
    const groupId = groups.createGroup(['a']);
    const doc = exportCanvasDocument(store);
    expect(doc.schemaVersion).toBe(3);
    expect(doc.nodes.find(n => n.id === 'a')?.parentId).toBe(groupId);
    const other = getInstanceReduxStore('grp-4b', { persistence: false });
    expect(importCanvasDocument(other, JSON.parse(JSON.stringify(doc)), vi.fn()).ok).toBe(true);
    expect(exportCanvasDocument(other).nodes.find(n => n.id === 'a')?.parentId).toBe(groupId);
    const broken = { ...doc, nodes: doc.nodes.map(n => (n.id === 'a' ? { ...n, parentId: 'b' } : n)) };
    expect(validateCanvasDocument(broken)).toMatchObject({ ok: false, errors: [expect.objectContaining({ path: expect.stringContaining('parentId') })] });
  });

  it('lays out group children inside their container with ELK', async () => {
    const { groups } = setup('grp-5');
    const groupId = groups.createGroup(['a', 'b']);
    await expect(runElkLayout(getEntityManager('grp-5'))).resolves.toMatchObject({ applied: true });
    const group = find('grp-5', groupId);
    const child = find('grp-5', 'b');
    expect(child && group && child.position.x >= group.position.x).toBe(true);
    expect(child && group && child.position.x + child.dimensions.width <= group.position.x + group.dimensions.width).toBe(true);
    expect(child && group && child.position.y + child.dimensions.height <= group.position.y + group.dimensions.height).toBe(true);
  });
});
