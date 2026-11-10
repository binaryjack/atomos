// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { PortSpec } from '@atomos-web/structura-core';
import { createNodeCommands } from '../src/features/workflow-canvas/create-node-commands.js';
import { getInstanceReduxStore } from '../src/shared/core/create-redux-store.js';
import { getEntityManager } from '../src/shared/core/presentation/entity-manager.js';
import { getCanvasRuntime } from '../src/shared/workflow-canvas/canvas-runtime.js';
import { getActiveSchema } from '../src/shared/workflow-canvas/connection-graph.js';

const port = (id: string, direction: 'in' | 'out'): PortSpec => ({ id, direction, dataType: 'json' });

const setup = (instanceId: string) => {
  const store = getInstanceReduxStore(instanceId, { persistence: false });
  const runtime = getCanvasRuntime(instanceId);
  runtime.nodeTypes.register({
    type: 'task',
    label: 'Task',
    ports: config => [port('in', 'in'), port('out', 'out'), ...(config['extra'] ? [port('extra', 'out')] : [])],
  });
  const reconcile = vi.fn();
  return { store, runtime, reconcile, commands: createNodeCommands(instanceId, store, runtime, reconcile) };
};

const entityOf = (instanceId: string, id: string) =>
  getActiveSchema(getInstanceReduxStore(instanceId).get_state())?.entities.find(e => e.id === id);

describe('node types, addNode and lossless persistence', () => {
  it('persists nodeType, config, metadata and resolved ports through the domain layers', () => {
    const { commands } = setup('cmd-lossless');
    const id = commands.addNode({ type: 'task', id: 'n1', position: { x: 10, y: 20 }, config: { retries: 3 }, metadata: { owner: 'flow' } });
    expect(id).toBe('n1');
    getEntityManager('cmd-lossless').moveEntity('n1', { x: 50, y: 60 });
    expect(entityOf('cmd-lossless', 'n1')).toMatchObject({
      nodeType: 'task', config: { retries: 3 }, metadata: { owner: 'flow' }, position: { x: 50, y: 60 },
      ports: [port('in', 'in'), port('out', 'out')],
    });
  });

  it('rejects unknown node types and duplicate ids', () => {
    const { commands } = setup('cmd-errors');
    expect(() => commands.addNode({ type: 'nope', position: { x: 0, y: 0 } })).toThrow(/Unknown node type/);
    commands.addNode({ type: 'task', id: 'dup', position: { x: 0, y: 0 } });
    expect(() => commands.addNode({ type: 'task', id: 'dup', position: { x: 0, y: 0 } })).toThrow(/already exists/);
  });
});

describe('validated connections', () => {
  it('creates typed links with port ids and emits connection:rejected for invalid drops', () => {
    const { commands, runtime } = setup('cmd-connect');
    commands.addNode({ type: 'task', id: 'a', position: { x: 0, y: 0 } });
    commands.addNode({ type: 'task', id: 'b', position: { x: 300, y: 0 } });
    const rejected = vi.fn();
    runtime.events.on('connection:rejected', rejected);
    const result = commands.connect({ nodeId: 'a', portId: 'out' }, { nodeId: 'b', portId: 'in' });
    expect(result.ok).toBe(true);
    const link = getActiveSchema(getInstanceReduxStore('cmd-connect').get_state())?.links[0];
    expect(link).toMatchObject({ leftAnchorId: 'a::out', rightAnchorId: 'b::in', sourcePortId: 'out', targetPortId: 'in' });
    expect(commands.connect({ nodeId: 'a', portId: 'out' }, { nodeId: 'b', portId: 'in' }).ok).toBe(false);
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ reason: expect.any(String), source: { nodeId: 'a', portId: 'out' } }));
  });

  it('uses the custom validator registered on the runtime', () => {
    const { commands, runtime } = setup('cmd-custom');
    commands.addNode({ type: 'task', id: 'a', position: { x: 0, y: 0 } });
    commands.addNode({ type: 'task', id: 'b', position: { x: 300, y: 0 } });
    runtime.validator = () => ({ ok: false, reason: 'frozen' });
    expect(commands.connect({ nodeId: 'a', portId: 'out' }, { nodeId: 'b', portId: 'in' })).toEqual({ ok: false, reason: 'frozen' });
  });
});

describe('updateNodeConfig', () => {
  it('re-resolves ports, drops links to vanished ports, as one undo step', () => {
    const { commands, store, reconcile } = setup('cmd-config');
    commands.addNode({ type: 'task', id: 'a', position: { x: 0, y: 0 }, config: { extra: true } });
    commands.addNode({ type: 'task', id: 'b', position: { x: 300, y: 0 } });
    expect(commands.connect({ nodeId: 'a', portId: 'extra' }, { nodeId: 'b', portId: 'in' }).ok).toBe(true);
    commands.updateNodeConfig('a', {});
    expect(entityOf('cmd-config', 'a')?.ports?.map(p => p.id)).toEqual(['in', 'out']);
    expect(getActiveSchema(store.get_state())?.links).toHaveLength(0);
    expect(reconcile).toHaveBeenCalled();
    store.undo();
    expect(getActiveSchema(store.get_state())?.links).toHaveLength(1);
    expect(entityOf('cmd-config', 'a')?.config).toEqual({ extra: true });
  });

  it('removeNodes deletes the selection in one undo step', () => {
    const { commands, store, runtime } = setup('cmd-remove');
    commands.addNode({ type: 'task', id: 'a', position: { x: 0, y: 0 } });
    commands.addNode({ type: 'task', id: 'b', position: { x: 300, y: 0 } });
    runtime.selection.set(['a', 'b']);
    commands.removeNodes(runtime.selection.get());
    expect(getActiveSchema(store.get_state())?.entities).toHaveLength(0);
    expect(runtime.selection.get()).toEqual([]);
    store.undo();
    expect(getActiveSchema(store.get_state())?.entities).toHaveLength(2);
  });
});
