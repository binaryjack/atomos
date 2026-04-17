import type { WorkspaceConfig } from '@atomos-web/structura-core';
import { createCanvasPage } from '../preview/create-canvas-page.js';

/**
 * Mount the full canvas page UI into a container.
 * BREAKING v2.0.0: instanceId is now required.
 * Returns a cleanup function that removes the mounted element.
 */
export const mountCanvasPage = function(instanceId: string, container: HTMLElement, config?: WorkspaceConfig, mcpServerUrl?: string): () => void {
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'mountCanvasPage(instanceId, container, config?, mcpServerUrl?) requires a non-empty instanceId. ' +
      'v2.0.0 breaks backward compatibility: instanceId is now mandatory.'
    )
  }
  const page = createCanvasPage(instanceId, config, mcpServerUrl);
  container.appendChild(page.element);
  return () => {
    page.cleanup.destroy();
    if (page.element.parentElement === container) {
      container.removeChild(page.element);
    }
  };
};
