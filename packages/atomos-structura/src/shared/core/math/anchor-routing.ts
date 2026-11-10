import type { EdgePosition } from '../../../features/edge/types/edge-position.types.js';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const getEdgeCenter = function(rect: Rect, edge: EdgePosition): { x: number; y: number } {
  switch (edge) {
    case 'top': return { x: rect.x + rect.width / 2, y: rect.y };
    case 'bottom': return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case 'left': return { x: rect.x, y: rect.y + rect.height / 2 };
    case 'right': return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
  }
};

export const determineOptimalEdges = function(
  srcRect: Rect,
  dstRect: Rect
): { srcEdge: EdgePosition; dstEdge: EdgePosition } {
  const edges: EdgePosition[] = ['top', 'bottom', 'left', 'right'];
  let minDistance = Infinity;
  let bestSrcEdge: EdgePosition = 'right';
  let bestDstEdge: EdgePosition = 'left';

  for (const srcEdge of edges) {
    for (const dstEdge of edges) {
      const p1 = getEdgeCenter(srcRect, srcEdge);
      const p2 = getEdgeCenter(dstRect, dstEdge);
      
      // Calculate distances between edge centers
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDistance) {
        minDistance = dist;
        bestSrcEdge = srcEdge;
        bestDstEdge = dstEdge;
      }
    }
  }

  return { srcEdge: bestSrcEdge, dstEdge: bestDstEdge };
};
