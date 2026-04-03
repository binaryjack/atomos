import type { EntityInstance } from './types/entity-instance.types.js';
import type { EdgePosition } from '../features/edge/types/edge-position.types.js';
import { EDGE_HIT_SIZE } from '../features/edge/edge-hit-size.js';

/**
 * Tests whether a point (svgCoords) falls within the hit zone for a given
 * entity edge. Uses the same rectangle geometry as computeHit in create-edge.ts.
 * EDGE_HIT_SIZE must stay in sync with HIT_SIZE in create-edge.ts.
 */
export const testEdgeHit = function(
  entity: EntityInstance,
  side: EdgePosition,
  svgCoords: { x: number; y: number }
): boolean {
  const { x, y } = entity.position.value;
  const { width, height } = entity.dimensions.value;
  const c = svgCoords;
  const h = EDGE_HIT_SIZE;
  switch (side) {
    case 'top':    return c.x >= x && c.x <= x + width  && c.y >= y - h        && c.y <= y;
    case 'bottom': return c.x >= x && c.x <= x + width  && c.y >= y + height   && c.y <= y + height + h;
    case 'left':   return c.y >= y && c.y <= y + height && c.x >= x - h        && c.x <= x;
    case 'right':  return c.y >= y && c.y <= y + height && c.x >= x + width    && c.x <= x + width + h;
  }
};
