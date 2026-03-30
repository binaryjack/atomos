import type { EntityShape } from '@vbs/vbs-mod';
import { createChevron } from './create-chevron.js';
import { createCircle } from './create-circle.js';
import { createDiamond } from './create-diamond.js';
import { createOval } from './create-oval.js';
import { createParallelogram } from './create-parallelogram.js';
import { createTrapeze } from './create-trapeze.js';

export const createSVGShape = (shape: EntityShape, width: number, height: number, color?: string | undefined): SVGElement => {
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
    default:
      // Fallback
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', width.toString());
      rect.setAttribute('height', height.toString());
      rect.style.fill = color || '#1e293b';
      rect.style.stroke = '#3b82f6';
      rect.style.strokeWidth = '2px';
      return rect;
  }
};
