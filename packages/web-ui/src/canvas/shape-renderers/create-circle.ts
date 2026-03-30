import { applyCommonStyles } from './apply-common-styles.js';

export const createCircle = (width: number, height: number, color?: string): SVGEllipseElement => {
  const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  ellipse.setAttribute('cx', String(width / 2));
  ellipse.setAttribute('cy', String(height / 2));
  ellipse.setAttribute('rx', String(width / 2));
  ellipse.setAttribute('ry', String(height / 2));
  applyCommonStyles(ellipse, color);
  return ellipse;
};
