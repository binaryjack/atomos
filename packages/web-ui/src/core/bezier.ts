import type { EdgePosition } from '../features/edge/types/edge.types.js';

// Control-point offset as fraction of distance, clamped to [minOffset, maxOffset]
const MIN_OFFSET = 40;
const MAX_OFFSET = 200;
const OFFSET_RATIO = 0.45;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const offsetForEdge = (
  pos: { x: number; y: number },
  edge: EdgePosition,
  dist: number
): { x: number; y: number } => {
  const o = clamp(dist * OFFSET_RATIO, MIN_OFFSET, MAX_OFFSET);
  switch (edge) {
    case 'top':    return { x: pos.x,       y: pos.y - o };
    case 'bottom': return { x: pos.x,       y: pos.y + o };
    case 'left':   return { x: pos.x - o,   y: pos.y     };
    case 'right':  return { x: pos.x + o,   y: pos.y     };
  }
};

/**
 * Returns an SVG cubic-bezier path string connecting two anchor points.
 * srcEdge defines the exit direction from src.
 * dstEdge defines the entry direction into dst (optional; if omitted, mirrors srcEdge).
 */
export const bezierPath = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition
): string => {
  const dx = dst.x - src.x;
  const dy = dst.y - src.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const cp1 = offsetForEdge(src, srcEdge, dist);

  // If no dstEdge, infer the opposite of srcEdge for natural entry
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );
  const cp2 = offsetForEdge(dst, inferredDstEdge, dist);

  return (
    `M ${src.x} ${src.y} ` +
    `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${dst.x} ${dst.y}`
  );
};

/**
 * Returns the point at t=0.5 on the cubic bezier that bezierPath would draw.
 * Useful for positioning labels at the visual centre of a link.
 */
export const bezierMidpoint = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition
): { x: number; y: number } => {
  const dx = dst.x - src.x;
  const dy = dst.y - src.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const cp1 = offsetForEdge(src, srcEdge, dist);
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );
  const cp2 = offsetForEdge(dst, inferredDstEdge, dist);

  const t = 0.5;
  const mt = 1 - t;
  return {
    x: mt * mt * mt * src.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * dst.x,
    y: mt * mt * mt * src.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * dst.y,
  };
};
