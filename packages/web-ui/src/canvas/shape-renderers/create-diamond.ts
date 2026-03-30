import { applyCommonStyles } from './apply-common-styles.js';

export const createDiamond = (width: number, height: number, color?: string): SVGPolygonElement => {
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const points = [
    `${width / 2},0`,
    `${width},${height / 2}`,
    `${width / 2},${height}`,
    `0,${height / 2}`,
  ].join(' ');
  polygon.setAttribute('points', points);
  applyCommonStyles(polygon, color);
  return polygon;
};
