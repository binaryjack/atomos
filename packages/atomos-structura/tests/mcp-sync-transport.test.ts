// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it, vi } from 'vitest';
import type { Entity } from '@atomos-web/structura-core';
import { createMcpClient } from '../src/app/webview/mcp-client.js';
import { createInMemoryMcpTransport } from '../src/features/mcp-sync/create-in-memory-mcp-transport.js';
import { createMcpSync } from '../src/features/mcp-sync/create-mcp-sync.js';
import type { McpStatus } from '../src/features/mcp-sync/mcp-transport.types.js';
import { create_redux_store } from '../src/shared/core/create-redux-store.js';
import { getActiveSchema } from '../src/shared/workflow-canvas/connection-graph.js';

const entity = (id: string, name = id): Entity => ({
  id, code: id, name, createdAt: 0, updatedAt: 0, properties: [], position: { x: 0, y: 0 }, dimensions: { width: 120, height: 60 }, edges: [],
});
const link = (id: string, from: string, to: string) => ({
  id, leftEntityId: from, rightEntityId: to, leftAnchorId: `${from}::out`, rightAnchorId: `${to}::in`, leftCardinality: '1', rightCardinality: '1', renderType: 'bezier',
});

const setup = (instanceId: string) => {
  const store = create_redux_store({ instanceId, config: { persistence: false } });
  const memory = createInMemoryMcpTransport();
  const progress = vi.fn();
  const remote = vi.fn();
  const sync = createMcpSync(store, { transport: memory.transport, onNodeProgress: progress, onRemoteChange: remote });
  return { store, memory, progress, remote, sync };
};

const schema = (store: ReturnType<typeof create_redux_store>) => getActiveSchema(store.get_state());

describe('MCP sync over an injected transport', () => {
  it('reports connect, disconnect and reconnect statuses', () => {
    const { memory, sync } = setup('mcp-status');
    const seen: McpStatus[] = [];
    sync.onStatus(status => seen.push(status));
    expect(sync.status()).toBe('connected');
    memory.setStatus('disconnected');
    memory.setStatus('reconnecting');
    memory.setStatus('connected');
    sync.cleanup();
    expect(seen).toEqual(['disconnected', 'reconnecting', 'connected', 'disconnected']);
    expect(memory.isConnected()).toBe(false);
  });

  it('mirrors remote snapshots (adds, updates, removes nodes and links) as one undo step', () => {
    const { store, memory, remote } = setup('mcp-change');
    memory.emit('change', { entities: [entity('a'), entity('b')], links: [link('l1', 'a', 'b')] });
    expect(schema(store)?.entities.map(e => e.id)).toEqual(['a', 'b']);
    memory.emit('change', { entities: [entity('a', 'Renamed')], links: [] });
    expect(schema(store)?.entities).toEqual([expect.objectContaining({ id: 'a', name: 'Renamed' })]);
    expect(schema(store)?.links).toEqual([]);
    expect(remote).toHaveBeenCalledTimes(2);
    store.undo();
    expect(schema(store)?.entities).toHaveLength(2);
  });

  it('routes node progress to the overlay callback, never into the document', () => {
    const { store, memory, progress } = setup('mcp-progress');
    const before = store.get_state();
    memory.emit('node-progress', { node_id: 'a', status: 'completed', progress: 1 });
    expect(progress).toHaveBeenCalledWith('a', { status: 'succeeded', progress: 1 });
    expect(store.get_state()).toBe(before);
  });

  it('answers frontend action requests through transport.send', async () => {
    const { store, memory, sync } = setup('mcp-actions');
    memory.emit('change', { entities: [entity('a')], links: [] });
    memory.emit('frontend-action-request', { action: 'structura_undo', reqId: 'r1', args: {} });
    expect(schema(store)?.entities).toHaveLength(0);
    const handler = vi.fn((e: Event) => (e as CustomEvent).detail.sendResult({ layouts: ['layered'] }));
    sync.events.addEventListener('vbs-mcp-action', handler);
    memory.emit('frontend-action-request', { action: 'structura_get_layouts', reqId: 'r2', args: {} });
    await Promise.resolve();
    expect(memory.sent).toEqual([{ reqId: 'r1', result: {} }, { reqId: 'r2', result: { layouts: ['layered'] } }]);
  });

  it('applies workspace events and ignores malformed or unknown events', () => {
    const { store, memory } = setup('mcp-workspace');
    memory.emit('workspace', { type: 'schema-created', id: 's2', name: 'Orders' });
    expect(Object.keys(store.get_state().workspace.canvases['canvas-default']?.schemas ?? {})).toContain('s2');
    const before = store.get_state();
    memory.emitRaw({ type: 'change', data: 'NOT_JSON' });
    memory.emit('change', 'still not a snapshot');
    memory.emit('mystery', { anything: true });
    expect(store.get_state()).toBe(before);
  });

  it('createMcpClient exposes transport status and disconnects once', () => {
    const store = create_redux_store({ instanceId: 'mcp-client', config: { persistence: false } });
    const memory = createInMemoryMcpTransport();
    const client = createMcpClient({ transport: memory.transport, store });
    expect(client.connected).toBe(true);
    memory.setStatus('reconnecting');
    expect(client.status).toBe('reconnecting');
    client.disconnect();
    client.disconnect();
    expect(client.connected).toBe(false);
    expect(memory.isConnected()).toBe(false);
  });

  it('stays idle without a transport', () => {
    const store = create_redux_store({ instanceId: 'mcp-idle', config: { persistence: false } });
    expect(createMcpSync(store).status()).toBe('idle');
  });
});
