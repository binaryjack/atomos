import type { WorkspaceConfig } from '@atomos-web/structura-core';
import { createCanvasPage } from '../../pages/canvas-page/create-canvas-page.js';
import type { McpTransport } from '../../features/mcp-sync/mcp-transport.types.js';

/**
 * Mount the full canvas page UI into a container.
 * BREAKING v2.0.0: instanceId is now required.
 * Returns a cleanup function that removes the mounted element.
 */
export const mountCanvasPage = function(instanceId: string, container: HTMLElement, config?: WorkspaceConfig, mcpTransport?: McpTransport): () => void {
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'mountCanvasPage(instanceId, container, config?, mcpTransport?) requires a non-empty instanceId. ' +
      'v2.0.0 breaks backward compatibility: instanceId is now mandatory.'
    )
  }
  const page = createCanvasPage(instanceId, config, mcpTransport);
  container.appendChild(page.element);
  return () => {
    page.cleanup();
    if (page.element.parentElement === container) {
      container.removeChild(page.element);
    }
  };
};
