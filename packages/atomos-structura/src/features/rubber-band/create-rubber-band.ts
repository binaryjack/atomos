import type { CanvasViewport } from '../../core/create-canvas-viewport.js';
import type { EntityManager } from '../../core/presentation/entity-manager.js';

export interface RubberBandResult {
  readonly getSelectedIds: () => ReadonlySet<string>;
  readonly subscribe: (cb: (ids: ReadonlySet<string>) => void) => () => void;
  readonly cleanup: { destroy: () => void };
}

export const createRubberBand = (
  svgContainer: SVGSVGElement,
  viewportGroup: SVGGElement,
  viewport: CanvasViewport,
  entityManager: EntityManager,
): RubberBandResult => {
  const listeners = new Set<(ids: ReadonlySet<string>) => void>();
  let selectedIds: ReadonlySet<string> = new Set();

  const ns = 'http://www.w3.org/2000/svg';
  const bandRect = document.createElementNS(ns, 'rect');
  bandRect.setAttribute('fill', 'rgba(59,130,246,0.1)');
  bandRect.setAttribute('stroke', '#3b82f6');
  bandRect.setAttribute('stroke-width', '1');
  bandRect.setAttribute('pointer-events', 'none');
  bandRect.style.display = 'none';
  viewportGroup.appendChild(bandRect);

  let dragging = false;
  let originWorld = { x: 0, y: 0 };

  const screenToWorld = (cx: number, cy: number): { x: number; y: number } => {
    const { pan, zoom } = viewport.state.value;
    return { x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom };
  };

  const notify = (): void => { listeners.forEach(cb => cb(selectedIds)); };

  const onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    // Only activate with Shift held — normal drag pans the canvas
    if (!e.shiftKey) return;
    // Only start on direct SVG canvas background (empty space)
    const target = e.target as Element;
    const tag = target.tagName.toLowerCase();
    if (tag !== 'svg' && tag !== 'rect' && !target.id.startsWith('canvas-grid')) return;
    // Ignore if it's an entity element
    if (target.closest('[data-entity-id]')) return;

    // Prevent the viewport pan handler from also activating
    e.stopPropagation();

    dragging = true;
    originWorld = screenToWorld(e.clientX, e.clientY);
    bandRect.style.display = 'block';
    bandRect.setAttribute('x', String(originWorld.x));
    bandRect.setAttribute('y', String(originWorld.y));
    bandRect.setAttribute('width', '0');
    bandRect.setAttribute('height', '0');
  };

  const onMouseMove = (e: MouseEvent): void => {
    if (!dragging) return;
    const cur = screenToWorld(e.clientX, e.clientY);
    bandRect.setAttribute('x', String(Math.min(cur.x, originWorld.x)));
    bandRect.setAttribute('y', String(Math.min(cur.y, originWorld.y)));
    bandRect.setAttribute('width', String(Math.abs(cur.x - originWorld.x)));
    bandRect.setAttribute('height', String(Math.abs(cur.y - originWorld.y)));
  };

  const onMouseUp = (e: MouseEvent): void => {
    if (!dragging) return;
    dragging = false;

    const cur = screenToWorld(e.clientX, e.clientY);
    const x = Math.min(cur.x, originWorld.x);
    const y = Math.min(cur.y, originWorld.y);
    const w = Math.abs(cur.x - originWorld.x);
    const h = Math.abs(cur.y - originWorld.y);

    bandRect.style.display = 'none';

    // Threshold — ignore tiny accidental drags
    if (w < 4 && h < 4) return;

    const ids = new Set<string>();
    entityManager.getAllEntities().forEach(ent => {
      const { x: ex, y: ey } = ent.position;
      const { width: ew, height: eh } = ent.dimensions;
      if (ex + ew >= x && ex <= x + w && ey + eh >= y && ey <= y + h) {
        ids.add(ent.id);
      }
    });

    selectedIds = ids;
    notify();
  };

  svgContainer.addEventListener('mousedown', onMouseDown);
  svgContainer.addEventListener('mousemove', onMouseMove);
  svgContainer.addEventListener('mouseup', onMouseUp);

  return {
    getSelectedIds: () => selectedIds,
    subscribe: cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    cleanup: {
      destroy: () => {
        svgContainer.removeEventListener('mousedown', onMouseDown);
        svgContainer.removeEventListener('mousemove', onMouseMove);
        svgContainer.removeEventListener('mouseup', onMouseUp);
        bandRect.remove();
      },
    },
  };
};
