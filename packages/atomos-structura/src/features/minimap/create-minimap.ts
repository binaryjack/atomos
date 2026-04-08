import type { CanvasViewport } from '../../core/create-canvas-viewport.js';
import type { EntityManager } from '../../core/presentation/entity-manager.js';

const MINI_W = 180;
const MINI_H = 120;
const PADDING = 40;

export interface MinimapResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}

export const createMinimap = function(
  entityManager: EntityManager,
  viewport: CanvasViewport,
  canvasContainer: HTMLElement,
  leftAnchor?: HTMLElement,
): MinimapResult {
  const cleanups: Array<() => void> = [];
  let visible = true;

  // Wrapper — positioned bottom-left (after leftAnchor) or bottom-right fallback
  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:absolute;bottom:16px;z-index:25;',
    'display:flex;flex-direction:column;align-items:flex-end;gap:4px;',
  ].join('');

  const positionWrap = (): void => {
    if (leftAnchor) {
      const anchorRight = leftAnchor.offsetLeft + leftAnchor.offsetWidth;
      wrap.style.left = `${anchorRight + 8}px`;
      wrap.style.right = '';
    } else {
      wrap.style.right = '16px';
      wrap.style.left = '';
    }
  };

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.title = 'Toggle minimap';
  toggleBtn.style.cssText = [
    'background:rgba(15,23,42,0.92);',
    'border:1px solid var(--vbs-border,#27272a);border-radius:4px;',
    'color:var(--vbs-text-secondary,#a1a1aa);cursor:pointer;',
    'font-size:10px;font-family:system-ui,sans-serif;padding:2px 6px;',
    'line-height:1.4;',
  ].join('');
  toggleBtn.textContent = 'map';

  // Canvas element
  const canvas = document.createElement('canvas') as MiniCanvas;
  canvas.width = MINI_W;
  canvas.height = MINI_H;
  canvas.style.cssText = [
    `width:${MINI_W}px;height:${MINI_H}px;`,
    'border-radius:6px;cursor:crosshair;',
    'border:1px solid var(--vbs-border,#27272a);',
    'background:rgba(0,0,0,0.85);',
    'box-shadow:0 4px 12px rgba(0,0,0,0.4);',
  ].join('');

  const ctx = canvas.getContext('2d');

  const render = (): void => {
    if (!ctx || !visible) return;
    const entities = entityManager.getAllEntities();
    ctx.clearRect(0, 0, MINI_W, MINI_H);

    if (entities.length === 0) {
      ctx.fillStyle = 'rgba(100,116,139,0.3)';
      ctx.fillRect(0, 0, MINI_W, MINI_H);
      return;
    }

    // Compute world bounding box of all entities
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(e => {
      minX = Math.min(minX, e.position.x);
      minY = Math.min(minY, e.position.y);
      maxX = Math.max(maxX, e.position.x + e.dimensions.width);
      maxY = Math.max(maxY, e.position.y + e.dimensions.height);
    });

    minX -= PADDING; minY -= PADDING;
    maxX += PADDING; maxY += PADDING;
    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scaleX = MINI_W / worldW;
    const scaleY = MINI_H / worldH;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (MINI_W - worldW * scale) / 2;
    const offsetY = (MINI_H - worldH * scale) / 2;

    const toMini = (wx: number, wy: number): [number, number] => [
      offsetX + (wx - minX) * scale,
      offsetY + (wy - minY) * scale,
    ];

    // Draw entity rectangles
    entities.forEach(e => {
      const [x, y] = toMini(e.position.x, e.position.y);
      const w = e.dimensions.width * scale;
      const h = e.dimensions.height * scale;
      ctx.fillStyle = 'rgba(59,130,246,0.4)';
      ctx.strokeStyle = 'rgba(59,130,246,0.8)';
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    });

    // Draw viewport rect
    const vs = viewport.state.value;
    const rect = canvasContainer.getBoundingClientRect();
    const screenW = rect.width;
    const screenH = rect.height;
    // Viewport world corners
    const vx0 = -vs.pan.x / vs.zoom;
    const vy0 = -vs.pan.y / vs.zoom;
    const vx1 = vx0 + screenW / vs.zoom;
    const vy1 = vy0 + screenH / vs.zoom;

    const [vMinX, vMinY] = toMini(vx0, vy0);
    const vW = (vx1 - vx0) * scale;
    const vH = (vy1 - vy0) * scale;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(vMinX, vMinY, vW, vH);
    ctx.setLineDash([]);

    // Store computed values for click→pan mapping
    canvas._miniState = { minX, minY, scale, offsetX, offsetY };
  };

  // Click/drag on minimap → pan viewport
  let isDragging = false;

  const panToMiniCoord = (cx: number, cy: number): void => {
    const s = (canvas as MiniCanvas)._miniState;
    if (!s) return;
    const worldX = (cx - s.offsetX) / s.scale + s.minX;
    const worldY = (cy - s.offsetY) / s.scale + s.minY;
    const rect = canvasContainer.getBoundingClientRect();
    const { zoom } = viewport.state.value;
    viewport.panTo(
      rect.width / 2 - worldX * zoom,
      rect.height / 2 - worldY * zoom,
    );
  };

  const getMiniCoords = (e: MouseEvent): { x: number; y: number } => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('mousedown', (e) => { isDragging = true; panToMiniCoord(getMiniCoords(e).x, getMiniCoords(e).y); });
  canvas.addEventListener('mousemove', (e) => { if (isDragging) panToMiniCoord(getMiniCoords(e).x, getMiniCoords(e).y); });
  const stopDrag = (): void => { isDragging = false; };
  canvas.addEventListener('mouseup', stopDrag);
  canvas.addEventListener('mouseleave', stopDrag);

  toggleBtn.addEventListener('click', () => {
    visible = !visible;
    canvas.style.display = visible ? 'block' : 'none';
    toggleBtn.style.opacity = visible ? '1' : '0.5';
    if (visible) render();
  });

  // Re-render on viewport changes
  const unsubViewport = viewport.state.subscribe(() => render());
  cleanups.push(unsubViewport);

  // Re-render on entity changes
  const unsubEntities = entityManager.onApplicationEvent(() => render());
  cleanups.push(unsubEntities);

  render();

  wrap.appendChild(toggleBtn);
  wrap.appendChild(canvas);
  canvasContainer.appendChild(wrap);

  // Position after DOM insertion so offsetWidth is available
  positionWrap();

  // Keep position in sync if anchor or container resizes
  if (leftAnchor && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => positionWrap());
    ro.observe(leftAnchor);
    cleanups.push(() => ro.disconnect());
  }

  return {
    element: wrap,
    cleanup: {
      destroy: () => {
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      },
    },
  };
};

// Augment HTMLCanvasElement for internal state
interface MiniState { minX: number; minY: number; scale: number; offsetX: number; offsetY: number }
type MiniCanvas = HTMLCanvasElement & { _miniState?: MiniState };
