// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Webview bootstrap: createCanvasPage is replaced at module level so no real DOM is touched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContainerStub, createMemoryStorage } from './support/recording-event-source.js';
import { createInMemoryMcpTransport } from '../src/features/mcp-sync/create-in-memory-mcp-transport.js';

vi.stubGlobal('localStorage', createMemoryStorage());

const destroySpy = vi.fn();
const canvasElement = createContainerStub('canvas-root');

vi.mock('../src/pages/canvas-page/create-canvas-page.js', () => ({
  createCanvasPage: vi.fn(() => ({ element: canvasElement, cleanup: { destroy: destroySpy } })),
}));

import { initializeStructuraWebview } from '../src/app/webview/index.js';
import { createCanvasPage } from '../src/pages/canvas-page/create-canvas-page.js';

type WebviewInput = Parameters<typeof initializeStructuraWebview>[0];

const mountInto = (container: ReturnType<typeof createContainerStub>, match?: string) => {
  vi.stubGlobal('document', { getElementById: (id: string) => (match === undefined || id === match ? container : null) });
};

describe('initializeStructuraWebview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when the container element is not found', async () => {
    vi.stubGlobal('document', { getElementById: () => null });
    await expect(
      initializeStructuraWebview({ containerId: 'missing' } as unknown as WebviewInput)
    ).rejects.toThrow('[Structura Webview v2.0.0] instanceId is REQUIRED');
  });

  it('uses #app as the default containerId', async () => {
    const container = createContainerStub('app');
    mountInto(container, 'app');
    await initializeStructuraWebview({ instanceId: 'test-instance' });
    expect(container.children).toContain(canvasElement);
  });

  it('accepts a custom containerId', async () => {
    const container = createContainerStub('custom');
    mountInto(container, 'custom');
    await initializeStructuraWebview({ instanceId: 'test-instance', containerId: 'custom' });
    expect(container.children).toContain(canvasElement);
  });

  it('calls createCanvasPage with workspaceConfig and the injected MCP transport', async () => {
    mountInto(createContainerStub('app'));
    const workspaceConfig = { headless: true } as never;
    const { transport } = createInMemoryMcpTransport();
    await initializeStructuraWebview({ instanceId: 'test-instance', mcpTransport: transport, workspaceConfig });
    expect(createCanvasPage).toHaveBeenCalledWith('test-instance', workspaceConfig, transport, undefined);
  });

  it('calls createCanvasPage without a transport when none is provided', async () => {
    mountInto(createContainerStub('app'));
    await initializeStructuraWebview({ instanceId: 'test-instance' });
    expect(createCanvasPage).toHaveBeenCalledWith('test-instance', undefined, undefined, undefined);
  });

  it('mounts the canvas element into the container', async () => {
    const container = createContainerStub('app');
    mountInto(container);
    const app = await initializeStructuraWebview({ instanceId: 'test-instance' });
    expect(app.element).toBe(canvasElement);
    expect(container.children).toContain(canvasElement);
  });

  it('disconnect() calls page.cleanup.destroy()', async () => {
    mountInto(createContainerStub('app'));
    const app = await initializeStructuraWebview({ instanceId: 'test-instance' });
    await app.disconnect();
    expect(destroySpy).toHaveBeenCalledOnce();
  });

  it('disconnect() is safe to call multiple times', async () => {
    mountInto(createContainerStub('app'));
    const app = await initializeStructuraWebview({ instanceId: 'test-instance' });
    await app.disconnect();
    await app.disconnect();
    expect(destroySpy).toHaveBeenCalledTimes(2);
  });
});
