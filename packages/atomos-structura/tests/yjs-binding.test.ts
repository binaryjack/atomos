// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { createYjsBinding } from '../src/features/collaboration/create-yjs-binding.js';
import { createStoreEventBridge } from '../src/features/workflow-canvas/create-store-event-bridge.js';
import { createWorkflowCanvasApi } from '../src/features/workflow-canvas/create-workflow-canvas-api.js';
import { getInstanceReduxStore } from '../src/shared/core/create-redux-store.js';
import { getCanvasRuntime } from '../src/shared/workflow-canvas/canvas-runtime.js';

const makeCanvas = (instanceId: string) => {
  const store = getInstanceReduxStore(instanceId, { persistence: false });
  createStoreEventBridge(store, getCanvasRuntime(instanceId).events);
  const canvas = createWorkflowCanvasApi({ instanceId, store, reconcile: () => undefined, applyViewport: () => undefined });
  canvas.nodeTypes.register({ type: 'task', label: 'Task', ports: [
    { id: 'in', direction: 'in', dataType: 'any' }, { id: 'out', direction: 'out', dataType: 'any' }] });
  return canvas;
};

/** Two in-memory replicas that exchange every update (the transport is a direct call). */
const linkDocs = (a: Y.Doc, b: Y.Doc): void => {
  a.on('update', (update: Uint8Array, origin: unknown) => { if (origin !== 'peer') Y.applyUpdate(b, update, 'peer'); });
  b.on('update', (update: Uint8Array, origin: unknown) => { if (origin !== 'peer') Y.applyUpdate(a, update, 'peer'); });
};

describe('Yjs collaboration binding', () => {
  it('syncs node and edge edits both ways through two Y.Docs', () => {
    const left = makeCanvas('yjs-left');
    const right = makeCanvas('yjs-right');
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    linkDocs(docA, docB);
    createYjsBinding(left, docA);
    createYjsBinding(right, docB);

    left.addNode({ type: 'task', id: 'a', position: { x: 0, y: 0 }, config: { retries: 1 } });
    left.addNode({ type: 'task', id: 'b', position: { x: 300, y: 0 } });
    expect(left.connect({ nodeId: 'a', portId: 'out' }, { nodeId: 'b', portId: 'in' }).ok).toBe(true);
    expect(right.exportDocument().nodes.map(n => n.id).sort()).toEqual(['a', 'b']);
    expect(right.exportDocument().edges).toHaveLength(1);
    expect(docB.getMap('structura.nodes').get('a')).toMatchObject({ config: { retries: 1 } });

    right.updateNodeConfig('a', { retries: 5 });
    expect(left.exportDocument().nodes.find(n => n.id === 'a')?.config).toEqual({ retries: 5 });
    right.removeNodes(['b']);
    expect(left.exportDocument().nodes.map(n => n.id)).toEqual(['a']);
    expect(left.exportDocument().edges).toHaveLength(0);
  });

  it('applies remote changes as one undo step on the receiving canvas', () => {
    const left = makeCanvas('yjs-undo-left');
    const right = makeCanvas('yjs-undo-right');
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    linkDocs(docA, docB);
    createYjsBinding(left, docA);
    createYjsBinding(right, docB);
    left.transaction('two nodes', () => {
      left.addNode({ type: 'task', id: 'x', position: { x: 0, y: 0 } });
      left.addNode({ type: 'task', id: 'y', position: { x: 200, y: 0 } });
    });
    expect(right.exportDocument().nodes).toHaveLength(2);
    expect(right.canUndo()).toBe(true);
  });

  it('shows remote selections on the overlay layer through awareness', () => {
    const left = makeCanvas('yjs-presence-left');
    const right = makeCanvas('yjs-presence-right');
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    linkDocs(docA, docB);
    const awareA = new Awareness(docA);
    const awareB = new Awareness(docB);
    awareA.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      applyAwarenessUpdate(awareB, encodeAwarenessUpdate(awareA, [...added, ...updated, ...removed]), 'peer');
    });
    createYjsBinding(left, docA, { awareness: awareA, user: { name: 'Ada', color: '#f97316' } });
    createYjsBinding(right, docB, { awareness: awareB, user: { name: 'Bob', color: '#22d3ee' } });
    left.addNode({ type: 'task', id: 'shared', position: { x: 0, y: 0 } });
    left.setSelection(['shared']);
    expect(right.overlay.peersOn('shared')).toEqual([{ name: 'Ada', color: '#f97316', nodeIds: ['shared'] }]);
    left.clearSelection();
    expect(right.overlay.peersOn('shared')).toEqual([]);
  });
});
