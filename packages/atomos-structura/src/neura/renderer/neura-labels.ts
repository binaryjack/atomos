import type { NeuraNode, NeuraViewport } from '../core/neura-store.js';
import type { WebGLEngine } from './webgl-engine.js';

export interface NeuraLabelsController {
  renderOverlayLabels: (
    visibleNodes: NeuraNode[],
    state: { viewport: NeuraViewport; hoveredNodeId: string | null; selectedNodeId: string | null },
    focusId: string | null,
    labelsMode: 'focus-only' | 'auto' | 'always',
    activeNodeIds?: Set<string>
  ) => void;
  destroy: () => void;
}

/**
 * Strips technical ID prefixes and sanitizes node names for clean user-facing presentation.
 */
export function formatCleanLabel(node: NeuraNode): string {
  let raw = (node.metadata?.label ?? node.metadata?.name ?? '') as string;
  if (!raw && node.id) {
    raw = node.id;
  }

  // 1. Remove synthetic ID prefixes like 'sym_0_1:', 'file_0:', '[sym_1_2]', 'n0:', etc.
  let cleaned = raw
    .replace(/^(sym_\d+_\d+|file_\d+|node_\d+|n\d+)[:\s_-]+/i, '')
    .replace(/^\[(sym_\d+_\d+|file_\d+|node_\d+|n\d+)\]\s*/i, '')
    .trim();

  // 2. Extract basename if raw is a file path
  if (cleaned.includes('/') || cleaned.includes('\\')) {
    cleaned = cleaned.replace(/^.*[\\/]/, '');
  }

  // 3. Clean database migration timestamps (e.g. '20230923153322_actsOnRoleFeatures.Designer.cs' -> 'actsOnRoleFeatures.Designer.cs')
  cleaned = cleaned.replace(/^\d{10,16}_/, '');

  // 4. Handle anonymous AST nodes with friendly semantic identifiers
  if (cleaned === 'anonymous' || cleaned === '') {
    const kind = (node.metadata?.kind as string) || 'symbol';
    cleaned = kind === 'fn' ? 'anonymous fn' : kind === 'struct' ? 'anonymous struct' : 'symbol';
  }

  return cleaned;
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
    labelsMode: 'focus-only' | 'auto' | 'always',
    activeNodeIds?: Set<string>
  ) {
    const renderedIds = new Set<string>();
    const isZoomedIn = state.viewport.zoom >= 0.65;
    const isSelectionActive = Boolean(state.selectedNodeId);
    const mvp = webgl.computeMVPMatrix(state.viewport);
    const canvasW = canvas.width || 800;
    const canvasH = canvas.height || 600;

    // Track 2D bounding boxes in screen-space for anti-collision (Smart LOD)
    const renderedBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];

    for (const node of visibleNodes) {
      const isSelected = node.id === state.selectedNodeId;
      const isHovered = node.id === state.hoveredNodeId;
      const isFocused = isSelected || isHovered;
      const isConnectedNeighbor = activeNodeIds ? activeNodeIds.has(node.id) : false;
      const isMajorFile = isZoomedIn && node.metadata?.kind === 'file';
      const isActive = (node.activity ?? 0) > 0.3;

      // When a node is selected, ONLY the selected node and its direct neighbors are shown.
      // All other node labels fade out / are hidden to eliminate noise.
      let shouldRender = false;
      if (isSelectionActive) {
        shouldRender = isSelected || isConnectedNeighbor;
      } else if (labelsMode === 'focus-only') {
        shouldRender = isFocused;
      } else if (labelsMode === 'always') {
        shouldRender = true;
      } else {
        // 'auto' mode when no selection is active
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

          // Anti-collision: if not focused/connected, prevent rendering if too close to an existing label
          if (!isFocused && !isConnectedNeighbor && !isSelectionActive) {
            const hasCollision = renderedBoxes.some(
              b => Math.abs(b.x - screenX) < 85 && Math.abs(b.y - screenY) < 24
            );
            if (hasCollision) continue;
          }

          renderedBoxes.push({ x: screenX, y: screenY, w: 85, h: 24 });
          renderedIds.add(node.id);

          let el = labelsMap.get(node.id);
          if (!el) {
            el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
            el.style.transform = 'translate(-50%, -100%)';
            el.style.marginTop = '-12px';
            el.style.whiteSpace = 'nowrap';
            el.style.pointerEvents = 'none';
            el.style.borderRadius = '5px';
            el.style.padding = '3px 7px';
            el.style.backdropFilter = 'blur(8px)';
            el.style.transition = 'opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease';
            overlayContainer.appendChild(el);
            labelsMap.set(node.id, el);
          }

          const labelText = formatCleanLabel(node);
          el.innerText = labelText;

          el.style.left = `${screenX}px`;
          el.style.top = `${screenY}px`;

          if (isSelected) {
            el.style.zIndex = '120';
            el.style.color = '#ffffff';
            el.style.background = 'rgba(0, 119, 255, 0.92)';
            el.style.border = '1px solid rgba(147, 197, 253, 0.9)';
            el.style.fontSize = '12px';
            el.style.fontWeight = 'bold';
            el.style.boxShadow = '0 0 16px rgba(0, 119, 255, 0.6), 0 4px 12px rgba(0,0,0,0.8)';
          } else if (isFocused) {
            el.style.zIndex = '100';
            el.style.color = '#38bdf8';
            el.style.background = 'rgba(15, 23, 42, 0.9)';
            el.style.border = '1px solid rgba(56, 189, 248, 0.6)';
            el.style.fontSize = '12px';
            el.style.fontWeight = 'bold';
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
          } else if (isSelectionActive && isConnectedNeighbor) {
            // Connected neighbor in isolated 1-hop view
            el.style.zIndex = '90';
            el.style.color = '#67e8f9';
            el.style.background = 'rgba(8, 47, 73, 0.88)';
            el.style.border = '1px solid rgba(6, 182, 212, 0.6)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '600';
            el.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.35)';
          } else if (isActive) {
            el.style.zIndex = '50';
            el.style.color = '#fbbf24';
            el.style.background = 'rgba(15, 23, 42, 0.85)';
            el.style.border = '1px solid rgba(251, 191, 36, 0.4)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '600';
            el.style.boxShadow = '0 3px 8px rgba(0,0,0,0.5)';
          } else {
            el.style.zIndex = '10';
            el.style.color = '#cbd5e1';
            el.style.background = 'rgba(15, 23, 42, 0.75)';
            el.style.border = '1px solid rgba(148, 163, 184, 0.25)';
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
