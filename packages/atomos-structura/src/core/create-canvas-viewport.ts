import { createLocalStoragePersistence, readLocalStorage } from './create-local-storage-persistence.js';
import { createSignal } from '@atomos-web/prime';
import type { Signal } from '@atomos-web/prime';

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
  /** Convert screen (clientX/Y) coords to canvas (world) coords */
  readonly screenToCanvas: (clientX: number, clientY: number, containerRect: DOMRect) => { x: number; y: number };
  readonly cleanup: () => void;
}

export const createCanvasViewport = function(container: HTMLElement, svgElement?: SVGSVGElement): CanvasViewport {
  const cleanups: Array<() => void> = [];

  // Load saved viewport state from localStorage
  const savedState = readLocalStorage<ViewportState>('vbe2:canvas-viewport');
  const initialState: ViewportState = savedState ?? { pan: { x: 0, y: 0 }, zoom: 1 };
  
  const state = createSignal<ViewportState>(initialState);
  
  // Persist viewport changes
  const persistence = createLocalStoragePersistence('vbe2:canvas-viewport', state);
  cleanups.push(persistence.destroy);

  const transform = (): string => {
    const { pan, zoom } = state.value;
    return `translate(${pan.x},${pan.y}) scale(${zoom})`;
  };

  const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

  const panBy = (dx: number, dy: number) => {
    const { pan, zoom } = state.value;
    state.set({ pan: { x: pan.x + dx, y: pan.y + dy }, zoom });
  };

  const panTo = (x: number, y: number) => {
    state.set({ ...state.value, pan: { x, y } });
  };

  const zoomTo = (zoom: number, originX = 0, originY = 0) => {
    const { pan, zoom: oldZoom } = state.value;
    const newZoom = clampZoom(zoom);
    // Adjust pan so the zoom origin stays fixed on screen
    const scale = newZoom / oldZoom;
    const newPanX = originX - scale * (originX - pan.x);
    const newPanY = originY - scale * (originY - pan.y);
    state.set({ pan: { x: newPanX, y: newPanY }, zoom: newZoom });
  };

  const zoomBy = (delta: number, originX = 0, originY = 0) => {
    zoomTo(state.value.zoom + delta, originX, originY);
  };

  const reset = () => {
    state.set({ pan: { x: 0, y: 0 }, zoom: 1 });
  };

  const screenToCanvas = (clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } => {
    const { pan, zoom } = state.value;
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  };

  // --- Wheel zoom ---
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
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
      panOrigin = { ...state.value.pan };
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!panning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    state.set({ pan: { x: panOrigin.x + dx, y: panOrigin.y + dy }, zoom: state.value.zoom });
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
    screenToCanvas,
    cleanup: () => {
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
    }
  };
};
