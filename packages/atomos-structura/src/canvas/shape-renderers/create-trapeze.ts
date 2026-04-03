import { applyCommonStyles } from './apply-common-styles.js';

export const createTrapeze = (width: number, height: number, color?: string): SVGPolygonElement => {
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const inset = width * 0.15;
  const points = [
    `${inset},0`,
    `${width - inset},0`,
    `${width},${height}`,
    `0,${height}`,
  ].join(' ');
  polygon.setAttribute('points', points);
  applyCommonStyles(polygon, color);
  return polygon;
};
