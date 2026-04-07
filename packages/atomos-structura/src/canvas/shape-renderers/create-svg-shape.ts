import type { EntityShape } from '@atomos/structura-core'
import { getCustomShapes } from '../../core/adapters/toolbox-config-manager.js'
import { createChevron } from './create-chevron.js'
import { createCircle } from './create-circle.js'
import { createDiamond } from './create-diamond.js'
import { createOval } from './create-oval.js'
import { createParallelogram } from './create-parallelogram.js'
import { createTrapeze } from './create-trapeze.js'

export const createSVGShape = (shape: EntityShape, width: number, height: number, color?: string | undefined): SVGElement => {
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
      svgEl.setAttribute('fill', finalColor);
      svgEl.setAttribute('stroke', 'var(--vbs-primary, #3b82f6)');
      return svgEl;
    }
  }

  // Built-ins array mapping
  switch (shape) {
    case 'circle': return createCircle(width, height, color);
    case 'diamond': return createDiamond(width, height, color);
    case 'oval': return createOval(width, height, color);
    case 'parallelogram': return createParallelogram(width, height, color);
    case 'chevron': return createChevron(width, height, color);
    case 'trapeze': return createTrapeze(width, height, color);
    // Aliases mapped from Settings
    case 'cylinder' as any: return createOval(width, height, color); // Fallback
    case 'actor' as any: return createCircle(width, height, color); // Fallback
    case 'document' as any: return createTrapeze(width, height, color); // Fallback
    case 'note' as any: return createParallelogram(width, height, color); // Fallback
    default: {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', 'vbs-entity-shape vbs-entity-rect');
      rect.setAttribute('width', width.toString());
      rect.setAttribute('height', height.toString());
      const finalColor = color || 'var(--vbs-bg-panel, #09090b)';
      // fill and stroke via inline style: var() resolves, highest priority, always visible
      // stroke-width via presentation attribute: CSS class .vbs-entity-shape can override it
      rect.style.fill = finalColor;
      rect.style.stroke = 'var(--vbs-primary, #3b82f6)';
      rect.style.transition = 'all 0.2s ease-in-out';
      rect.setAttribute('stroke-width', '1');
      return rect;
    }
  }
};
