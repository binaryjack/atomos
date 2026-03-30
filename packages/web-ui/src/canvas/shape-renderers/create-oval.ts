import { applyCommonStyles } from './apply-common-styles.js';

export const createOval = (width: number, height: number, color?: string): SVGElement => {
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '0');
  rect.setAttribute('y', '0');
  rect.setAttribute('width', String(width));
  rect.setAttribute('height', String(height));
  rect.setAttribute('rx', String(Math.min(width, height) / 2));
  applyCommonStyles(rect, color);
  return rect;
};
