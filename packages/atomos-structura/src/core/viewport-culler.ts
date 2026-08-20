import type { CanvasViewport } from './create-canvas-viewport.js';
import type { EntityManager } from './presentation/entity-manager.js';

export interface ViewportCullerOptions {
  readonly buffer?: number;
  readonly minEntitiesForCulling?: number;
  readonly lodZoomThreshold?: number;
}

export interface ViewportCuller {
  readonly update: () => void;
  readonly destroy: () => void;
}

export const createViewportCuller = (
  entityManager: EntityManager,
  viewport: CanvasViewport,
  canvasContainer: HTMLElement,
  options: ViewportCullerOptions = {}
): ViewportCuller => {
  const buffer = options.buffer ?? 250;
  const minEntities = options.minEntitiesForCulling ?? 60;
  const lodZoomThreshold = options.lodZoomThreshold ?? 0.45;

  let rafId: number | null = null;

  const performCulling = (): void => {
    const entities = entityManager.getAllEntities();
    if (entities.length < minEntities) {
      // Un-hide any previously culled entities
      entities.forEach(e => {
        const el = document.querySelector(`[data-entity-id="${e.id}"]`) as HTMLElement | null;
        if (el && el.style.visibility === 'hidden') {
          el.style.visibility = '';
        }
      });
      return;
    }

    const vs = viewport.state.value;
    const rect = canvasContainer.getBoundingClientRect();
    const screenW = rect.width || window.innerWidth;
    const screenH = rect.height || window.innerHeight;

    // Viewport world coordinates
    const vx0 = -vs.pan.x / vs.zoom - buffer;
    const vy0 = -vs.pan.y / vs.zoom - buffer;
    const vx1 = vx0 + screenW / vs.zoom + buffer * 2;
    const vy1 = vy0 + screenH / vs.zoom + buffer * 2;

    // LOD threshold check
    if (vs.zoom < lodZoomThreshold) {
      canvasContainer.classList.add('vbs-lod-compact');
    } else {
      canvasContainer.classList.remove('vbs-lod-compact');
    }

    // Cull offscreen entities
    entities.forEach(e => {
      const el = document.querySelector(`[data-entity-id="${e.id}"]`) as HTMLElement | null;
      if (!el) return;

      const ex0 = e.position.x;
      const ey0 = e.position.y;
      const ex1 = ex0 + e.dimensions.width;
      const ey1 = ey0 + e.dimensions.height;

      const isVisible = ex1 >= vx0 && ex0 <= vx1 && ey1 >= vy0 && ey0 <= vy1;
      const newVisibility = isVisible ? '' : 'hidden';

      if (el.style.visibility !== newVisibility) {
        el.style.visibility = newVisibility;
      }
    });
  };

  const scheduleUpdate = (): void => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      performCulling();
    });
  };

  const unsubViewport = viewport.state.subscribe(() => scheduleUpdate());
  const unsubEntities = entityManager.onApplicationEvent(() => scheduleUpdate());

  scheduleUpdate();

  return {
    update: scheduleUpdate,
    destroy: () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubViewport();
      unsubEntities();
      canvasContainer.classList.remove('vbs-lod-compact');
    },
  };
};
