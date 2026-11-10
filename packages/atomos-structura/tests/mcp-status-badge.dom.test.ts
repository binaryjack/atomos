// @vitest-environment happy-dom
// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { createInMemoryMcpTransport } from '../src/features/mcp-sync/create-in-memory-mcp-transport.js';
import { mountMcpStatusBadge } from '../src/features/mcp-sync/create-mcp-status-badge.js';
import { createMcpSync } from '../src/features/mcp-sync/create-mcp-sync.js';
import { create_redux_store } from '../src/shared/core/create-redux-store.js';

describe('MCP status on the toolbar', () => {
  it('shows connection, disconnection and reconnection', () => {
    const toolbar = document.createElement('div');
    const memory = createInMemoryMcpTransport();
    const sync = createMcpSync(create_redux_store({ instanceId: 'badge', config: { persistence: false } }), { transport: memory.transport });
    const cleanups = mountMcpStatusBadge(sync, toolbar);
    const badge = toolbar.lastElementChild as HTMLElement;
    expect(badge.getAttribute('role')).toBe('status');
    expect(badge.dataset.status).toBe('connected');
    memory.setStatus('disconnected');
    expect(badge.getAttribute('aria-label')).toBe('MCP: disconnected');
    memory.setStatus('reconnecting');
    expect(badge.dataset.status).toBe('reconnecting');
    memory.setStatus('connected');
    expect(badge.title).toBe('MCP: connected');
    cleanups.forEach(fn => fn());
    expect(toolbar.children).toHaveLength(0);
  });

  it('mounts nothing when there is no toolbar host', () => {
    const memory = createInMemoryMcpTransport();
    const sync = createMcpSync(create_redux_store({ instanceId: 'badge-none', config: { persistence: false } }), { transport: memory.transport });
    expect(mountMcpStatusBadge(sync, null)).toEqual([]);
  });
});
