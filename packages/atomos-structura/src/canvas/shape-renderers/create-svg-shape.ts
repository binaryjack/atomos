import type { EntityShape } from '@atomos-web/structura-core'
import { getCustomShapes } from '../../core/adapters/toolbox-config-manager.js'
import { applyCommonStyles } from './apply-common-styles.js'
import { createChevron } from './create-chevron.js'
import { createCircle } from './create-circle.js'
import { createDiamond } from './create-diamond.js'
import { createOval } from './create-oval.js'
import { createParallelogram } from './create-parallelogram.js'
import { createTrapeze } from './create-trapeze.js'

export const createSVGShape = (shape: EntityShape, width: number, height: number, color?: string | undefined): SVGElement => {
  // Built-in native renderers take priority — prevents defaultShapes repository entries
  // with the same IDs (diamond, circle, etc.) from shadowing optimised native paths.
  switch (shape) {
    case 'circle': return createCircle(width, height, color);
    case 'diamond': return createDiamond(width, height, color);
    case 'oval': return createOval(width, height, color);
    case 'parallelogram': return createParallelogram(width, height, color);
    case 'chevron': return createChevron(width, height, color);
    case 'trapeze': return createTrapeze(width, height, color);
    // Toolbox aliases → native fallbacks
    case 'cylinder' as any: return createOval(width, height, color);
    case 'actor' as any: return createCircle(width, height, color);
    case 'document' as any: return createTrapeze(width, height, color);
    case 'note' as any: return createParallelogram(width, height, color);
  }

  // Non-built-in ID: look up the user-defined custom shape repository.
  const customShapes = getCustomShapes();
  const customShape = customShapes.find(s => s.id === (shape as string));

  if (customShape) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(customShape.svg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (svgEl) {
      svgEl.setAttribute('width', width.toString());
      svgEl.setAttribute('height', height.toString());
      const finalColor = color || 'var(--vbs-bg-panel, #09090b)';
      // setAttribute('style') works on DOMParser elements before adoption into main document.
      // .style CSSStyleDeclaration is unavailable on cross-document XML nodes.
      // CSS var() resolves correctly inside inline style strings.
      svgEl.setAttribute('style', `fill: ${finalColor}; stroke: var(--vbs-primary, #3b82f6); stroke-width: 1; transition: all 0.2s ease-in-out;`);
      return svgEl;
    }
  }

  // Final fallback: plain rect
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', width.toString());
  rect.setAttribute('height', height.toString());
  rect.setAttribute('rx', '4');
  rect.setAttribute('ry', '4');
  applyCommonStyles(rect, color);
  return rect;
};
