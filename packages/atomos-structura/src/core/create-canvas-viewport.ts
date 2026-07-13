import type { Signal } from '@atomos-web/prime'
import { createSignal } from '@atomos-web/prime'

export const CANVAS_SIZE = 4000;
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.1;

export interface ViewportState {
  readonly pan: { x: number; y: number };
  readonly zoom: number;
}

export interface CanvasViewport {
  readonly state: Signal<ViewportState>;
  /** SVG transform string for the content group */
  readonly transform: () => string;
  readonly panBy: (dx: number, dy: number) => void;
  readonly panTo: (x: number, y: number) => void;
  readonly zoomTo: (zoom: number, originX?: number, originY?: number) => void;
  readonly zoomBy: (delta: number, originX?: number, originY?: number) => void;
  readonly reset: () => void;
  readonly setExternalState: (state: ViewportState) => void;
  /** Convert screen (clientX/Y) coords to canvas (world) coords */
  readonly screenToCanvas: (clientX: number, clientY: number, containerRect: DOMRect) => { x: number; y: number };
  readonly setMouseZoomEnabled: (enabled: boolean) => void;
  readonly cleanup: () => void;
}

/**
 * Validate that viewport state is structurally correct and contains valid numbers.
 * Prevents NaN propagation from corrupt localStorage.
 */
const isValidViewportState = (data: any): data is ViewportState => {
  return (
    data &&
    typeof data.zoom === 'number' &&
    Number.isFinite(data.zoom) &&
    data.pan !== null &&
    typeof data.pan === 'object' &&
    typeof data.pan.x === 'number' &&
    Number.isFinite(data.pan.x) &&
    typeof data.pan.y === 'number' &&
    Number.isFinite(data.pan.y)
  );
};

export const createCanvasViewport = function(
  container: HTMLElement, 
  svgElement: SVGSVGElement | undefined, 
  initialState: ViewportState,
  onChange?: (state: ViewportState) => void
): CanvasViewport {
  const cleanups: Array<() => void> = [];
  
  const state = createSignal<ViewportState>(initialState);

  // Helper to update state and trigger onChange
  const updateState = (newState: ViewportState) => {
    // Clone objects so that the Signal detects a strict equality mismatch
    const stateClone = { zoom: newState.zoom, pan: { x: newState.pan.x, y: newState.pan.y } };
    // console.log('[VIEWPORT-LOG] updateState called with:', JSON.stringify(stateClone));
    state.set(stateClone);
    if (onChange) onChange(stateClone);
  };

  const transform = (): string => {
    const { pan, zoom } = state.value;
    const safePanX = (pan && Number.isFinite(pan.x)) ? pan.x : 0;
    const safePanY = (pan && Number.isFinite(pan.y)) ? pan.y : 0;
    const safeZoom = Number.isFinite(zoom) ? zoom : 1;
    const t = `translate(${safePanX},${safePanY}) scale(${safeZoom})`;
    // console.log(`[VIEWPORT-LOG] transform generated: ${t} from state:`, JSON.stringify({ pan, zoom }));
    return t;
  };

  const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

  const panBy = (dx: number, dy: number) => {
    const { pan, zoom } = state.value;
    // console.log(`[VIEWPORT-LOG] panBy dx:${dx}, dy:${dy}`);
    updateState({ pan: { x: pan.x + dx, y: pan.y + dy }, zoom });
  };

  const panTo = (x: number, y: number) => {
    // console.log(`[VIEWPORT-LOG] panTo requested x:${x}, y:${y}`);
    const { zoom } = state.value;
    let safeX = Number.isFinite(x) ? x : 0;
    let safeY = Number.isFinite(y) ? y : 0;
    // Prevent flying off into space, but clamp instead of resetting to 0
    safeX = Math.max(-500000, Math.min(500000, safeX));
    safeY = Math.max(-500000, Math.min(500000, safeY));
    
    updateState({
      zoom,
      pan: { x: safeX, y: safeY }
    });
  };

  const zoomTo = (zoom: number, originX = 0, originY = 0) => {
    // console.log(`[VIEWPORT-LOG] zoomTo requested zoom:${zoom}, originX:${originX}, originY:${originY}`);
    const { pan, zoom: oldZoom } = state.value;
    const newZoom = clampZoom(zoom);

    // Ensure pan and oldZoom are valid before calculating
    const currentPan = (pan && Number.isFinite(pan.x) && Number.isFinite(pan.y)) ? pan : { x: 0, y: 0 };
    const currentZoom = Number.isFinite(oldZoom) ? oldZoom : 1;

    const scale = newZoom / currentZoom;
    let newPanX = originX - scale * (originX - currentPan.x);
    let newPanY = originY - scale * (originY - currentPan.y);

    newPanX = Math.max(-500000, Math.min(500000, newPanX));
    newPanY = Math.max(-500000, Math.min(500000, newPanY));

    updateState({
      pan: { x: newPanX, y: newPanY },
      zoom: newZoom
    });
  };

  const zoomBy = (delta: number, originX = 0, originY = 0) => {
    zoomTo(state.value.zoom + delta, originX, originY);
  };

  const reset = () => {
    // console.log('[VIEWPORT-LOG] reset requested');
    updateState({ pan: { x: 0, y: 0 }, zoom: 1 });
  };

  const setExternalState = (newState: ViewportState) => {
    // Clone objects so that the Signal detects a strict equality mismatch
    const stateClone = { zoom: newState.zoom, pan: { x: newState.pan.x, y: newState.pan.y } };
    // console.log('[VIEWPORT-LOG] setExternalState called with:', JSON.stringify(stateClone));
    state.set(stateClone);
  };

  const screenToCanvas = (clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } => {
    const { pan, zoom } = state.value;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  };

  // --- Wheel zoom ---
  let mouseZoomEnabled = true;
  const setMouseZoomEnabled = (enabled: boolean) => {
    mouseZoomEnabled = enabled;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!mouseZoomEnabled) return;
    const rect = container.getBoundingClientRect();
    const originX = e.clientX - rect.left;
    const originY = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    zoomBy(delta, originX, originY);
  };

  // --- Pan drag on background ---
  let panning = false;
  let panStart = { x: 0, y: 0 };
  let panOrigin = { x: 0, y: 0 };

  const onMouseDown = (e: MouseEvent) => {
    // Only pan on middle-button OR primary on the SVG background itself (not bubbled from entities)
    // Shift+drag is reserved for rubber-band multi-select — do not start panning
    if (e.shiftKey) return;
    const targetIsSvgBg = svgElement
      ? (e.target === svgElement || (e.target as Element).tagName === 'svg')
      : (e.target as Element).tagName === 'svg';
    if (e.button === 1 || (e.button === 0 && targetIsSvgBg)) {
      e.preventDefault();
      panning = true;
      panStart = { x: e.clientX, y: e.clientY };
      const currentPan = state.value.pan || { x: 0, y: 0 };
      panOrigin = { x: currentPan.x, y: currentPan.y };
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!panning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    // Safety check: ensure zoom is a finite number
    const zoom = Number.isFinite(state.value.zoom) ? state.value.zoom : 1;
    let newX = panOrigin.x + dx;
    let newY = panOrigin.y + dy;
    
    // console.log(`[VIEWPORT-LOG] onMouseMove (drag) dx:${dx} dy:${dy} | result newX:${newX} newY:${newY}`);
    
    newX = Math.max(-500000, Math.min(500000, newX));
    newY = Math.max(-500000, Math.min(500000, newY));
    
    updateState({ pan: { x: newX, y: newY }, zoom });
  };

  const onMouseUp = () => {
    panning = false;
  };

  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  cleanups.push(() => {
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  });

  return {
    state,
    transform,
    panBy,
    panTo,
    zoomTo,
    zoomBy,
    reset,
    setExternalState,
    screenToCanvas,
    setMouseZoomEnabled,
    cleanup: () => {
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
    }
  };
};
