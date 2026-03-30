import { applyCommonStyles } from './apply-common-styles.js';

export const createParallelogram = (width: number, height: number, color?: string): SVGPolygonElement => {
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const skew = width * 0.2;
  const points = [
    `${skew},0`,
    `${width},0`,
    `${width - skew},${height}`,
    `0,${height}`,
  ].join(' ');
  polygon.setAttribute('points', points);
  applyCommonStyles(polygon, color);
  return polygon;
};
