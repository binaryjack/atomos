import type { Signal } from '../../core/types/signal.types.js';
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js';

const HANDLE_SIZE = 8;

/** Box/rectangle entities need room for the property table. */
const BOX_MIN_W = 180;
const BOX_MIN_H = 100;
/** Compact SVG shapes (actor, diamond, circle, …) can shrink much further. */
const COMPACT_MIN_W = 48;
const COMPACT_MIN_H = 48;

const isBoxShape = (shape: string | undefined): boolean =>
  !shape || shape === 'box' || shape === 'rectangle';

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];

export interface EntityResizeHandlesResult {
  readonly handles: Map<Corner, SVGRectElement>;
  readonly syncHandles: (width: number, height: number, isSelected: boolean) => void;
  readonly cleanup: () => void;
}

export const createEntityResizeHandles = function(
  position: Signal<{ x: number; y: number }>,
  dimensions: Signal<{ width: number; height: number }>,
  selected: Signal<boolean>,
  workspace: WorkspaceManager,
  shape?: string
): EntityResizeHandlesResult {
  const MIN_W = isBoxShape(shape) ? BOX_MIN_W : COMPACT_MIN_W;
  const MIN_H = isBoxShape(shape) ? BOX_MIN_H : COMPACT_MIN_H;
  const cleanups: Array<() => void> = [];
  const handles = new Map<Corner, SVGRectElement>();

  CORNERS.forEach(corner => {
    const h = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    h.setAttribute('width', HANDLE_SIZE.toString());
    h.setAttribute('height', HANDLE_SIZE.toString());
    h.setAttribute('rx', '2');
    h.setAttribute('fill', '#3b82f6');
    h.setAttribute('stroke', '#fff');
    h.setAttribute('stroke-width', '1');
    h.setAttribute('opacity', '0');
    h.style.cursor = corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize';
    handles.set(corner, h);

    let resizing = false;
    let resizeStart = { svgX: 0, svgY: 0, w: 0, h: 0, px: 0, py: 0 };

    const onMouseDown = (e: Event): void => {
      const me = e as MouseEvent;
      me.stopPropagation();
      if (!selected.value) return;
      resizing = true;
      const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
      const { width, height } = dimensions.value;
      const { x, y } = position.value;
      resizeStart = { svgX: svg.x, svgY: svg.y, w: width, h: height, px: x, py: y };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: Event): void => {
      if (!resizing) return;
      const me = e as MouseEvent;
      const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
      const dx = svg.x - resizeStart.svgX;
      const dy = svg.y - resizeStart.svgY;
      let newW = resizeStart.w;
      let newH = resizeStart.h;
      let newX = resizeStart.px;
      let newY = resizeStart.py;
      if (corner === 'br') { newW = Math.max(MIN_W, resizeStart.w + dx); newH = Math.max(MIN_H, resizeStart.h + dy); }
      if (corner === 'bl') { newW = Math.max(MIN_W, resizeStart.w - dx); newH = Math.max(MIN_H, resizeStart.h + dy); newX = resizeStart.px + (resizeStart.w - newW); }
      if (corner === 'tr') { newW = Math.max(MIN_W, resizeStart.w + dx); newH = Math.max(MIN_H, resizeStart.h - dy); newY = resizeStart.py + (resizeStart.h - newH); }
      if (corner === 'tl') { newW = Math.max(MIN_W, resizeStart.w - dx); newH = Math.max(MIN_H, resizeStart.h - dy); newX = resizeStart.px + (resizeStart.w - newW); newY = resizeStart.py + (resizeStart.h - newH); }
      dimensions.set({ width: newW, height: newH });
      position.set({ x: newX, y: newY });
    };

    const onMouseUp = (): void => {
      resizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    h.addEventListener('mousedown', onMouseDown as EventListener);
    cleanups.push(() => {
      h.removeEventListener('mousedown', onMouseDown as EventListener);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    });
  });

  const syncHandles = (width: number, height: number, isSelected: boolean): void => {
    const hs = HANDLE_SIZE / 2;
    const vis = isSelected ? '1' : '0';
    const positions: Record<Corner, { x: number; y: number }> = {
      tl: { x: -hs, y: -hs },
      tr: { x: width - hs, y: -hs },
      bl: { x: -hs, y: height - hs },
      br: { x: width - hs, y: height - hs },
    };
    CORNERS.forEach(c => {
      const h = handles.get(c)!;
      h.setAttribute('x', positions[c].x.toString());
      h.setAttribute('y', positions[c].y.toString());
      h.setAttribute('opacity', vis);
    });
  };

  return {
    handles,
    syncHandles,
    cleanup: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; }
  };
};

export type { Corner };
export { CORNERS };
