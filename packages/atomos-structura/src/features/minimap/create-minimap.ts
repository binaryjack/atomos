import type { CanvasViewport } from '../../core/create-canvas-viewport.js';
import type { EntityManager } from '../../core/presentation/entity-manager.js';

const MINI_W = 200;
const MINI_H = 130;
const PADDING = 40;

export interface MinimapResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
  readonly refresh: () => void;
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

  // Mini HUD Toolbar
  const hudBar = document.createElement('div');
  hudBar.style.cssText = [
    'display:flex;align-items:center;gap:3px;',
    'background:rgba(15,23,42,0.92);padding:2px 4px;border-radius:6px;',
    'border:1px solid var(--vbs-border,#27272a);backdrop-filter:blur(4px);',
    'box-shadow:0 2px 8px rgba(0,0,0,0.3);',
  ].join('');

  const makeHudBtn = (title: string, label: string, onClick: () => void) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = title;
    btn.textContent = label;
    btn.style.cssText = [
      'background:transparent;border:none;',
      'color:var(--vbs-text-secondary,#a1a1aa);cursor:pointer;',
      'font-size:11px;font-family:system-ui,sans-serif;padding:2px 6px;',
      'line-height:1.2;border-radius:3px;',
      'transition:background 0.15s, color 0.15s;',
    ].join('');
    btn.onmouseenter = () => {
      btn.style.background = 'rgba(255,255,255,0.1)';
      btn.style.color = '#fff';
    };
    btn.onmouseleave = () => {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--vbs-text-secondary,#a1a1aa)';
    };
    btn.onclick = (e) => {
      e.stopPropagation();
      onClick();
    };
    return btn;
  };

  const zoomInBtn = makeHudBtn('Zoom In', '+', () => viewport.zoomBy(1.2));
  const zoomOutBtn = makeHudBtn('Zoom Out', '−', () => viewport.zoomBy(0.8));
  const fitBtn = makeHudBtn('Fit to Screen', '⛶', () => {
    const entities = entityManager.getAllEntities();
    if (entities.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(e => {
      minX = Math.min(minX, e.position.x);
      minY = Math.min(minY, e.position.y);
      maxX = Math.max(maxX, e.position.x + e.dimensions.width);
      maxY = Math.max(maxY, e.position.y + e.dimensions.height);
    });
    const rect = canvasContainer.getBoundingClientRect();
    const w = maxX - minX;
    const h = maxY - minY;
    const scale = Math.min(0.9, Math.min((rect.width - 80) / w, (rect.height - 80) / h));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    viewport.setZoom(scale);
    viewport.panTo(rect.width / 2 - cx * scale, rect.height / 2 - cy * scale);
  });

  const toggleBtn = makeHudBtn('Toggle minimap', '🗺', () => {
    visible = !visible;
    canvas.style.display = visible ? 'block' : 'none';
    toggleBtn.style.opacity = visible ? '1' : '0.5';
    if (visible) render();
  });

  hudBar.appendChild(zoomInBtn);
  hudBar.appendChild(zoomOutBtn);
  hudBar.appendChild(fitBtn);
  hudBar.appendChild(toggleBtn);

  // Canvas element
  const canvas = document.createElement('canvas') as MiniCanvas;
  canvas.width = MINI_W;
  canvas.height = MINI_H;
  canvas.style.cssText = [
    `width:${MINI_W}px;height:${MINI_H}px;`,
    'border-radius:6px;cursor:crosshair;',
    'border:1px solid var(--vbs-border,#27272a);',
    'background:rgba(2,6,23,0.92);backdrop-filter:blur(8px);',
    'box-shadow:0 4px 16px rgba(0,0,0,0.5);',
  ].join('');

  const ctx = canvas.getContext('2d');

  const render = (): void => {
    if (!ctx || !visible) return;
    const entities = entityManager.getAllEntities();
    const links = entityManager.getAllLinks();
    ctx.clearRect(0, 0, MINI_W, MINI_H);

    if (entities.length === 0) {
      ctx.fillStyle = 'rgba(100,116,139,0.2)';
      ctx.fillRect(0, 0, MINI_W, MINI_H);
      return;
    }

    // Compute world bounding box
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

    const entityPosMap = new Map<string, { x: number; y: number; w: number; h: number }>();
    entities.forEach(e => {
      const [x, y] = toMini(e.position.x, e.position.y);
      const w = e.dimensions.width * scale;
      const h = e.dimensions.height * scale;
      entityPosMap.set(e.id, { x, y, w, h });
    });

    // 1. Draw Zones (Background layer)
    const zones = entities.filter(e => (e as any).nodeType === 'zone' || (e as any).metadata?.isZone);
    zones.forEach(z => {
      const p = entityPosMap.get(z.id);
      if (!p) return;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
    });

    // 2. Draw Links
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    links.forEach(l => {
      const s = entityPosMap.get(l.sourceEntityId);
      const t = entityPosMap.get(l.targetEntityId);
      if (!s || !t) return;
      ctx.beginPath();
      ctx.moveTo(s.x + s.w / 2, s.y + s.h / 2);
      ctx.lineTo(t.x + t.w / 2, t.y + t.h / 2);
      ctx.stroke();
    });

    // 3. Draw Standard Nodes and Sticky Notes
    const standardEntities = entities.filter(e => (e as any).nodeType !== 'zone' && !(e as any).metadata?.isZone);
    standardEntities.forEach(e => {
      const p = entityPosMap.get(e.id);
      if (!p) return;

      const isSticky = (e as any).nodeType === 'sticky-note' || (e as any).metadata?.isStickyNote;
      if (isSticky) {
        ctx.fillStyle = (e as any).noteColor || '#fef08a';
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.fillRect(p.x, p.y, Math.max(p.w, 4), Math.max(p.h, 4));
        ctx.strokeRect(p.x, p.y, Math.max(p.w, 4), Math.max(p.h, 4));
        return;
      }

      const color = e.color || '#3b82f6';
      ctx.fillStyle = color.startsWith('#') ? `${color}66` : 'rgba(59,130,246,0.4)';
      ctx.strokeStyle = color.startsWith('#') ? color : '#3b82f6';
      ctx.lineWidth = 1;
      ctx.fillRect(p.x, p.y, Math.max(p.w, 4), Math.max(p.h, 4));
      ctx.strokeRect(p.x, p.y, Math.max(p.w, 4), Math.max(p.h, 4));
    });

    // 4. Draw Viewport Rect Overlay
    const vs = viewport.state.value;
    const rect = canvasContainer.getBoundingClientRect();
    const screenW = rect.width;
    const screenH = rect.height;

    const vx0 = -vs.pan.x / vs.zoom;
    const vy0 = -vs.pan.y / vs.zoom;
    const vx1 = vx0 + screenW / vs.zoom;
    const vy1 = vy0 + screenH / vs.zoom;

    const [vMinX, vMinY] = toMini(vx0, vy0);
    const vW = (vx1 - vx0) * scale;
    const vH = (vy1 - vy0) * scale;

    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fillRect(vMinX, vMinY, vW, vH);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.strokeRect(vMinX, vMinY, vW, vH);
    ctx.setLineDash([]);

    // Store state for click/drag mapping
    canvas._miniState = { minX, minY, scale, offsetX, offsetY };
  };

  // Click & drag pan mapping
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

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    panToMiniCoord(getMiniCoords(e).x, getMiniCoords(e).y);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) panToMiniCoord(getMiniCoords(e).x, getMiniCoords(e).y);
  });
  const stopDrag = (): void => { isDragging = false; };
  canvas.addEventListener('mouseup', stopDrag);
  canvas.addEventListener('mouseleave', stopDrag);

  // Subscriptions
  const unsubViewport = viewport.state.subscribe(() => render());
  cleanups.push(unsubViewport);

  const unsubEntities = entityManager.onApplicationEvent(() => render());
  cleanups.push(unsubEntities);

  render();

  wrap.appendChild(hudBar);
  wrap.appendChild(canvas);
  canvasContainer.appendChild(wrap);

  positionWrap();

  if (leftAnchor && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => positionWrap());
    ro.observe(leftAnchor);
    cleanups.push(() => ro.disconnect());
  }

  return {
    element: wrap,
    refresh: render,
    cleanup: {
      destroy: () => {
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      },
    },
  };
};

interface MiniState { minX: number; minY: number; scale: number; offsetX: number; offsetY: number }
type MiniCanvas = HTMLCanvasElement & { _miniState?: MiniState };
