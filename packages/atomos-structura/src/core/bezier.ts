import type { EdgePosition } from '../features/edge/types/edge.types.js'
import { routeAStar } from './routing/astar-router.js'

// Control-point offset as fraction of distance, clamped to [minOffset, maxOffset]
const MIN_OFFSET = 80;
const MAX_OFFSET = 300;
const OFFSET_RATIO = 0.6;

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

const roundedOrthogonalPath = (pts: {x: number, y: number}[], radius: number = 20): string => {
  if (pts.length < 2) return '';
  let d = `M ${pts[0]!.x} ${pts[0]!.y} `;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]!;
    const curr = pts[i]!;
    const next = pts[i + 1]!;
    
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
    
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
    
    const r = Math.min(radius, len1 / 2.1, len2 / 2.1);
    
    if (r === 0) {
      d += `L ${curr.x} ${curr.y} `;
      continue;
    }
    
    const p1x = curr.x - (dx1 / len1) * r;
    const p1y = curr.y - (dy1 / len1) * r;
    
    const p2x = curr.x + (dx2 / len2) * r;
    const p2y = curr.y + (dy2 / len2) * r;
    
    d += `L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y} `;
  }
  d += `L ${pts[pts.length - 1]!.x} ${pts[pts.length - 1]!.y}`;
  return d;
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
  dstEdge?: EdgePosition,
  obstacles?: { x: number; y: number; width: number; height: number }[]
): string => {
  // If no dstEdge, infer the opposite of srcEdge for natural entry
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );

  if (obstacles && obstacles.length > 0) {
    try {
      const pts = routeAStar(src, srcEdge, dst, inferredDstEdge, obstacles);
      return roundedOrthogonalPath(pts, 30);
    } catch (e) {
      console.warn("AStar routing failed in bezierPath, falling back to simple bezier", e);
    }
  }

  const dx = dst.x - src.x;
  const dy = dst.y - src.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const cp1 = offsetForEdge(src, srcEdge, dist);
  const cp2 = offsetForEdge(dst, inferredDstEdge, dist);

  return (
    `M ${src.x} ${src.y} ` +
    `C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${dst.x} ${dst.y}`
  );
};

/**
 * Returns a simple SVG linear path string connecting two points.
 */
export const linearPath = (
  src: { x: number; y: number },
  dst: { x: number; y: number }
): string => {
  return `M ${src.x} ${src.y} L ${dst.x} ${dst.y}`;
};

interface Box { minX: number; maxX: number; minY: number; maxY: number; }

const getBox = (pt: {x: number; y: number}, edge: EdgePosition, rect?: {x: number; y: number; width: number; height: number}): Box | null => {
  if (!rect) return null;
  const padding = 20; 
  return {
    minX: rect.x - padding,
    maxX: rect.x + rect.width + padding,
    minY: rect.y - padding,
    maxY: rect.y + rect.height + padding
  };
};

const routeToX = (p: {x: number; y: number}, edge: EdgePosition, targetX: number, box: Box | null): {x: number; y: number}[] => {
  if (!box || (edge === 'left' && targetX <= p.x) || (edge === 'right' && targetX >= p.x)) {
    return [{ x: targetX, y: p.y }];
  }
  const routeTop = Math.abs(p.y - box.minY) < Math.abs(p.y - box.maxY);
  const yRoute = routeTop ? box.minY : box.maxY;
  return [{ x: p.x, y: yRoute }, { x: targetX, y: yRoute }];
};

const routeToY = (p: {x: number; y: number}, edge: EdgePosition, targetY: number, box: Box | null): {x: number; y: number}[] => {
  if (!box || (edge === 'top' && targetY <= p.y) || (edge === 'bottom' && targetY >= p.y)) {
    return [{ x: p.x, y: targetY }];
  }
  const routeLeft = Math.abs(p.x - box.minX) < Math.abs(p.x - box.maxX);
  const xRoute = routeLeft ? box.minX : box.maxX;
  return [{ x: xRoute, y: p.y }, { x: xRoute, y: targetY }];
};

export const getOrthogonalPoints = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition,
  srcRect?: { x: number; y: number; width: number; height: number },
  dstRect?: { x: number; y: number; width: number; height: number }
): { x: number; y: number }[] => {
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );

  const isSrcHorizontal = srcEdge === 'left' || srcEdge === 'right';
  const isDstHorizontal = inferredDstEdge === 'left' || inferredDstEdge === 'right';

  const MIN_OFFSET = 20;

  const p1 = { x: src.x, y: src.y };
  if (srcEdge === 'top') p1.y -= MIN_OFFSET;
  if (srcEdge === 'bottom') p1.y += MIN_OFFSET;
  if (srcEdge === 'left') p1.x -= MIN_OFFSET;
  if (srcEdge === 'right') p1.x += MIN_OFFSET;

  const p2 = { x: dst.x, y: dst.y };
  if (inferredDstEdge === 'top') p2.y -= MIN_OFFSET;
  if (inferredDstEdge === 'bottom') p2.y += MIN_OFFSET;
  if (inferredDstEdge === 'left') p2.x -= MIN_OFFSET;
  if (inferredDstEdge === 'right') p2.x += MIN_OFFSET;

  const srcBox = getBox(src, srcEdge, srcRect);
  const dstBox = getBox(dst, inferredDstEdge, dstRect);

  const pts = [{ x: src.x, y: src.y }, p1];

  if (isSrcHorizontal && isDstHorizontal) {
    let midX = (p1.x + p2.x) / 2;
    if (srcEdge === 'right' && inferredDstEdge === 'left' && p2.x < p1.x) {
      midX = (p1.x + p2.x) / 2;
    } else if (srcEdge === inferredDstEdge) {
      midX = srcEdge === 'right' ? Math.max(p1.x, p2.x) + MIN_OFFSET : Math.min(p1.x, p2.x) - MIN_OFFSET;
    }
    const pSrcHalf = routeToX(p1, srcEdge, midX, srcBox);
    const pDstHalf = routeToX(p2, inferredDstEdge, midX, dstBox);
    pts.push(...pSrcHalf);
    pts.push(...pDstHalf.reverse());
  } else if (!isSrcHorizontal && !isDstHorizontal) {
    let midY = (p1.y + p2.y) / 2;
    if (srcEdge === 'bottom' && inferredDstEdge === 'top' && p2.y < p1.y) {
      midY = (p1.y + p2.y) / 2;
    } else if (srcEdge === inferredDstEdge) {
      midY = srcEdge === 'bottom' ? Math.max(p1.y, p2.y) + MIN_OFFSET : Math.min(p1.y, p2.y) - MIN_OFFSET;
    }
    const pSrcHalf = routeToY(p1, srcEdge, midY, srcBox);
    const pDstHalf = routeToY(p2, inferredDstEdge, midY, dstBox);
    pts.push(...pSrcHalf);
    pts.push(...pDstHalf.reverse());
  } else if (isSrcHorizontal && !isDstHorizontal) {
    const targetX = (p1.x + p2.x) / 2;
    const targetY = (p1.y + p2.y) / 2;
    const pSrcHalf = routeToX(p1, srcEdge, targetX, srcBox);
    const pDstHalf = routeToY(p2, inferredDstEdge, targetY, dstBox);
    pts.push(...pSrcHalf);
    const lastSrc = pSrcHalf[pSrcHalf.length - 1] || p1;
    const lastDst = pDstHalf[pDstHalf.length - 1] || p2;
    if (lastSrc.x !== targetX || lastDst.y !== targetY) {
      pts.push({ x: targetX, y: targetY });
    }
    pts.push({ x: lastSrc.x, y: lastDst.y });
    pts.push(...pDstHalf.reverse());
  } else {
    const targetX = (p1.x + p2.x) / 2;
    const targetY = (p1.y + p2.y) / 2;
    const pSrcHalf = routeToY(p1, srcEdge, targetY, srcBox);
    const pDstHalf = routeToX(p2, inferredDstEdge, targetX, dstBox);
    pts.push(...pSrcHalf);
    const lastSrc = pSrcHalf[pSrcHalf.length - 1] || p1;
    const lastDst = pDstHalf[pDstHalf.length - 1] || p2;
    if (lastSrc.y !== targetY || lastDst.x !== targetX) {
      pts.push({ x: targetX, y: targetY }); 
    }
    pts.push({ x: lastDst.x, y: lastSrc.y });
    pts.push(...pDstHalf.reverse());
  }

  pts.push(p2);
  pts.push({ x: dst.x, y: dst.y });

  return cleanCollinearPoints(pts);
};

const cleanCollinearPoints = (pts: {x: number; y: number}[]): {x: number; y: number}[] => {
  if (pts.length <= 2) return pts;
  
  const cleanPts = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = cleanPts[cleanPts.length - 1]!;
    const curr = pts[i]!;
    const next = pts[i + 1]!;
    
    // If it's a straight line, skip the middle point
    if ((prev.x === curr.x && curr.x === next.x) || (prev.y === curr.y && curr.y === next.y)) {
      continue;
    }
    // Also skip duplicate points
    if (prev.x === curr.x && prev.y === curr.y) {
      continue;
    }
    cleanPts.push(curr);
  }
  const lastPrev = cleanPts[cleanPts.length - 1]!;
  const last = pts[pts.length - 1]!;
  if (lastPrev.x !== last.x || lastPrev.y !== last.y) {
    cleanPts.push(last);
  }

  return cleanPts;
};

/**
 * Returns an SVG orthogonal path string (composed of horizontal and vertical line segments).
 */
export const orthogonalPath = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition,
  srcRect?: { x: number; y: number; width: number; height: number },
  dstRect?: { x: number; y: number; width: number; height: number },
  obstacles?: { x: number; y: number; width: number; height: number }[]
): string => {
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );

  let pts: { x: number; y: number }[] = [];
  if (obstacles && obstacles.length > 0) {
    try {
      pts = routeAStar(src, srcEdge, dst, inferredDstEdge, obstacles);
    } catch (e) {
      console.warn("AStar routing failed, falling back to simple orthogonal", e);
      pts = getOrthogonalPoints(src, srcEdge, dst, dstEdge, srcRect, dstRect);
    }
  } else {
    pts = getOrthogonalPoints(src, srcEdge, dst, dstEdge, srcRect, dstRect);
  }
    
  return `M ${pts[0]!.x} ${pts[0]!.y} ` + pts.slice(1).map((p: any) => `L ${p.x} ${p.y}`).join(' ');
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
export const linearMidpoint = (
  src: { x: number; y: number },
  dst: { x: number; y: number }
): { x: number; y: number } => {
  return { x: (src.x + dst.x) / 2, y: (src.y + dst.y) / 2 };
};

export const orthogonalMidpoint = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition,
  srcRect?: { x: number; y: number; width: number; height: number },
  dstRect?: { x: number; y: number; width: number; height: number },
  obstacles?: { x: number; y: number; width: number; height: number }[]
): { x: number; y: number } => {
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );

  let pts: { x: number; y: number }[] = [];
  if (obstacles && obstacles.length > 0) {
    try {
      pts = routeAStar(src, srcEdge, dst, inferredDstEdge, obstacles);
    } catch (e) {
      pts = getOrthogonalPoints(src, srcEdge, dst, dstEdge, srcRect, dstRect);
    }
  } else {
    pts = getOrthogonalPoints(src, srcEdge, dst, dstEdge, srcRect, dstRect);
  }
  
  // Calculate total path length
  let totalLength = 0;
  const segmentLengths: number[] = [];
  
  for (let i = 1; i < pts.length; i++) {
    const p1 = pts[i - 1]!;
    const p2 = pts[i]!;
    const segLength = Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y); // orthogonol distance
    segmentLengths.push(segLength);
    totalLength += segLength;
  }
  
  const targetLength = totalLength / 2;
  let currentLength = 0;
  
  for (let i = 0; i < segmentLengths.length; i++) {
    const segLength = segmentLengths[i]!;
    if (currentLength + segLength >= targetLength) {
      const remainingLength = targetLength - currentLength;
      const fraction = segLength > 0 ? remainingLength / segLength : 0;
      
      const p1 = pts[i]!;
      const p2 = pts[i + 1]!;
      
      return {
        x: p1.x + (p2.x - p1.x) * fraction,
        y: p1.y + (p2.y - p1.y) * fraction
      };
    }
    currentLength += segLength;
  }
  
  // Fallback to the physical midpoint if calculation fails
  const midIndex = Math.floor(pts.length / 2);
  const pA = pts[midIndex - 1]!;
  const pB = pts[midIndex]!;
  return { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
};

export const getMidpoint = (
  renderType: string | undefined,
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition,
  srcRect?: { x: number; y: number; width: number; height: number },
  dstRect?: { x: number; y: number; width: number; height: number },
  obstacles?: { x: number; y: number; width: number; height: number }[]
): { x: number; y: number } => {
  if (renderType === 'linear') return linearMidpoint(src, dst);
  if (renderType === 'orthogonal') return orthogonalMidpoint(src, srcEdge, dst, dstEdge, srcRect, dstRect, obstacles);
  return bezierMidpoint(src, srcEdge, dst, dstEdge);
};