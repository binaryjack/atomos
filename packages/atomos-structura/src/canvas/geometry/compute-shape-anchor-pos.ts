import type { EntityShape } from '@atomos/structura-core'
import type { EdgePosition } from '../../features/edge/types/edge.types.js'

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type AnchorCalculator = (box: Box, edge: EdgePosition) => Point;

const calculateRectangleAnchor: AnchorCalculator = (box, edge) => {
  switch (edge) {
    case 'top':    return { x: box.x + box.width / 2, y: box.y };
    case 'bottom': return { x: box.x + box.width / 2, y: box.y + box.height };
    case 'left':   return { x: box.x,                 y: box.y + box.height / 2 };
    case 'right':  return { x: box.x + box.width,     y: box.y + box.height / 2 };
  }
};

const calculateDiamondAnchor: AnchorCalculator = (box, edge) => {
    // A diamond connects at the exact same cardinal midpoints of its bounding box.
    return calculateRectangleAnchor(box, edge);
};

const calculateEllipseAnchor: AnchorCalculator = (box, edge) => {
    // Circle/Oval cardinal points are exactly on the bounding box midpoints.
    return calculateRectangleAnchor(box, edge);
};

const calculateParallelogramAnchor: AnchorCalculator = (box, edge) => {
    // Parallelogram leaning right. Top edge is shifted right.
    const skew = box.width * 0.2; // 20% skew
    switch (edge) {
      case 'top':    return { x: box.x + box.width / 2 + skew / 2, y: box.y };
      case 'bottom': return { x: box.x + box.width / 2 - skew / 2, y: box.y + box.height };
      case 'left':   return { x: box.x + skew / 2,                 y: box.y + box.height / 2 };
      case 'right':  return { x: box.x + box.width - skew / 2,     y: box.y + box.height / 2 };
    }
};

const calculateTrapezeAnchor: AnchorCalculator = (box, edge) => {
    // Trapeze (shorter top).
    const inset = box.width * 0.15;
    switch (edge) {
      case 'top':    return { x: box.x + box.width / 2, y: box.y };
      case 'bottom': return { x: box.x + box.width / 2, y: box.y + box.height };
      case 'left':   return { x: box.x + inset / 2,     y: box.y + box.height / 2 };
      case 'right':  return { x: box.x + box.width - inset / 2, y: box.y + box.height / 2 };
    }
};

const calculateChevronAnchor: AnchorCalculator = (box, edge) => {
    // Chevron pointing right
    const point = box.width * 0.2;
    switch (edge) {
      case 'top':    return { x: box.x + box.width / 2, y: box.y };
      case 'bottom': return { x: box.x + box.width / 2, y: box.y + box.height };
      case 'left':   return { x: box.x + point,         y: box.y + box.height / 2 };
      case 'right':  return { x: box.x + box.width,     y: box.y + box.height / 2 };
    }
};

export const computeShapeAnchorPos = (shape: EntityShape | undefined, box: Box, edge: EdgePosition): Point => {
    switch (shape) {
        case 'diamond': return calculateDiamondAnchor(box, edge);
        case 'circle': 
        case 'oval': return calculateEllipseAnchor(box, edge);
        case 'parallelogram': return calculateParallelogramAnchor(box, edge);
        case 'trapeze': return calculateTrapezeAnchor(box, edge);
        case 'chevron': return calculateChevronAnchor(box, edge);
        case 'rectangle':
        default: return calculateRectangleAnchor(box, edge);
    }
};
