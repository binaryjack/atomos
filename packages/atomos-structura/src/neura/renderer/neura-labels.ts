import type { NeuraNode, NeuraViewport } from '../core/neura-store.js';
import type { WebGLEngine } from './webgl-engine.js';

export interface NeuraLabelsController {
  renderOverlayLabels: (
    visibleNodes: NeuraNode[],
    state: { viewport: NeuraViewport; hoveredNodeId: string | null; selectedNodeId: string | null },
    focusId: string | null,
    labelsMode: 'focus-only' | 'auto' | 'always'
  ) => void;
  destroy: () => void;
}

export function createNeuraLabelsController(
  canvas: HTMLCanvasElement,
  overlayContainer: HTMLElement,
  webgl: WebGLEngine
): NeuraLabelsController {
  const labelsMap = new Map<string, HTMLDivElement>();

  function renderOverlayLabels(
    visibleNodes: NeuraNode[],
    state: { viewport: NeuraViewport; hoveredNodeId: string | null; selectedNodeId: string | null },
    focusId: string | null,
    labelsMode: 'focus-only' | 'auto' | 'always'
  ) {
    const renderedIds = new Set<string>();
    const isZoomedIn = state.viewport.zoom >= 0.7;
    const mvp = webgl.computeMVPMatrix(state.viewport);
    const canvasW = canvas.width || 800;
    const canvasH = canvas.height || 600;

    for (const node of visibleNodes) {
      const isFocused = node.id === focusId;
      const isMajorFile = isZoomedIn && node.metadata?.kind === 'file';
      const isActive = (node.activity ?? 0) > 0.3;

      let shouldRender = false;
      if (labelsMode === 'focus-only') {
        shouldRender = isFocused;
      } else if (labelsMode === 'always') {
        shouldRender = true;
      } else {
        shouldRender = isFocused || isMajorFile || isActive;
      }

      if (shouldRender) {
        const nx = node.x;
        const ny = node.y;
        const nz = node.z ?? 0;

        const clipX = mvp[0]! * nx + mvp[4]! * ny + mvp[8]! * nz + mvp[12]!;
        const clipY = mvp[1]! * nx + mvp[5]! * ny + mvp[9]! * nz + mvp[13]!;
        const clipW = mvp[3]! * nx + mvp[7]! * ny + mvp[11]! * nz + mvp[15]!;

        if (clipW > 0.1) {
          const screenX = (clipX / clipW * 0.5 + 0.5) * canvasW;
          const screenY = (1.0 - (clipY / clipW * 0.5 + 0.5)) * canvasH;

          renderedIds.add(node.id);
          let el = labelsMap.get(node.id);
          if (!el) {
            el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            el.style.transform = 'translate(-50%, -100%)';
            el.style.marginTop = '-12px';
            el.style.whiteSpace = 'nowrap';
            el.style.pointerEvents = 'none';
            el.style.borderRadius = '4px';
            el.style.padding = '2px 6px';
            el.style.backdropFilter = 'blur(6px)';
            el.style.transition = 'opacity 0.15s ease';
            overlayContainer.appendChild(el);
            labelsMap.set(node.id, el);
          }

          const labelText = (node.metadata?.label ?? node.metadata?.name ?? node.id) as string;
          el.innerText = labelText;

          el.style.left = `${screenX}px`;
          el.style.top = `${screenY}px`;

          if (isFocused) {
            el.style.zIndex = '100';
            el.style.color = '#38bdf8';
            el.style.background = 'rgba(15, 23, 42, 0.85)';
            el.style.border = '1px solid rgba(56, 189, 248, 0.4)';
            el.style.fontSize = '12px';
            el.style.fontWeight = 'bold';
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
          } else if (isActive) {
            el.style.zIndex = '50';
            el.style.color = '#fbbf24';
            el.style.background = 'rgba(15, 23, 42, 0.8)';
            el.style.border = '1px solid rgba(251, 191, 36, 0.4)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '600';
            el.style.boxShadow = '0 3px 8px rgba(0,0,0,0.5)';
          } else {
            el.style.zIndex = '10';
            el.style.color = '#cbd5e1';
            el.style.background = 'rgba(15, 23, 42, 0.7)';
            el.style.border = '1px solid rgba(148, 163, 184, 0.2)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '500';
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
          }
        }
      }
    }

    for (const [id, el] of labelsMap.entries()) {
      if (!renderedIds.has(id)) {
        el.remove();
        labelsMap.delete(id);
      }
    }
  }

  return {
    renderOverlayLabels,
    destroy: () => {
      for (const el of labelsMap.values()) {
        el.remove();
      }
      labelsMap.clear();
    },
  };
}
