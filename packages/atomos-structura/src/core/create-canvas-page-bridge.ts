import type { WorkspaceConfig } from '@atomos-web/structura-core';
import { createCanvasPage } from '../preview/create-canvas-page.js';

/**
 * Mount the full canvas page UI into a container.
 * Returns a cleanup function that removes the mounted element.
 */
export const mountCanvasPage = function(container: HTMLElement, config?: WorkspaceConfig): () => void {
  const page = createCanvasPage(config);
  container.appendChild(page.element);
  return () => {
    page.cleanup.destroy();
    if (page.element.parentElement === container) {
      container.removeChild(page.element);
    }
  };
};
