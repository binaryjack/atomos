import { applyCommonStyles } from './apply-common-styles.js';

export const createChevron = (width: number, height: number, color?: string): SVGPolygonElement => {
  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const arrowWidth = width * 0.2;
  const points = [
    `0,0`,
    `${width - arrowWidth},0`,
    `${width},${height / 2}`,
    `${width - arrowWidth},${height}`,
    `0,${height}`,
    `${arrowWidth},${height / 2}`,
  ].join(' ');
  polygon.setAttribute('points', points);
  applyCommonStyles(polygon, color);
  return polygon;
};
