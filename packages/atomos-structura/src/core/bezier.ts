import type { EdgePosition } from '../features/edge/types/edge.types.js';
import { computeAStarOrthogonalRoute } from './math/a-star-routing.js';

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

/**
 * Returns an SVG cubic-bezier path string connecting two anchor points.
 * srcEdge defines the exit direction from src.
 * dstEdge defines the entry direction into dst (optional; if omitted, mirrors srcEdge).
 */
export const getBezierControlPoints = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge: EdgePosition,
  srcRect?: { x: number; y: number; width: number; height: number },
  dstRect?: { x: number; y: number; width: number; height: number },
  dist?: number,
  obstacles?: { x: number; y: number; width: number; height: number }[]
): { cp1: { x: number; y: number }; cp2: { x: number; y: number } } => {
  const dVal = dist ?? Math.hypot(dst.x - src.x, dst.y - src.y);
  const escapeOffset = Math.max(80, Math.min(150, dVal * 0.4));
  const padding = 20;

  // 1. cp1
  let cp1: { x: number; y: number };
  if (srcRect && (
    (srcEdge === 'left' && dst.x > src.x) ||
    (srcEdge === 'right' && dst.x < src.x) ||
    (srcEdge === 'top' && dst.y > src.y) ||
    (srcEdge === 'bottom' && dst.y < src.y)
  )) {
    if (srcEdge === 'left' || srcEdge === 'right') {
      const dirX = srcEdge === 'left' ? -1 : 1;
      const goTop = dst.y < src.y;
      cp1 = {
        x: src.x + dirX * escapeOffset,
        y: goTop ? srcRect.y - padding : srcRect.y + srcRect.height + padding
      };
    } else {
      const dirY = srcEdge === 'top' ? -1 : 1;
      const goLeft = dst.x < src.x;
      cp1 = {
        x: goLeft ? srcRect.x - padding : srcRect.x + srcRect.width + padding,
        y: src.y + dirY * escapeOffset
      };
    }
  } else {
    cp1 = offsetForEdge(src, srcEdge, dVal);
  }

  // 2. cp2
  let cp2: { x: number; y: number };
  if (dstRect && (
    (dstEdge === 'left' && src.x > dst.x) ||
    (dstEdge === 'right' && src.x < dst.x) ||
    (dstEdge === 'top' && src.y > dst.y) ||
    (dstEdge === 'bottom' && src.y < dst.y)
  )) {
    if (dstEdge === 'left' || dstEdge === 'right') {
      const dirX = dstEdge === 'left' ? -1 : 1;
      const goTop = src.y < dst.y;
      cp2 = {
        x: dst.x + dirX * escapeOffset,
        y: goTop ? dstRect.y - padding : dstRect.y + dstRect.height + padding
      };
    } else {
      const dirY = dstEdge === 'top' ? -1 : 1;
      const goLeft = src.x < dst.x;
      cp2 = {
        x: goLeft ? dstRect.x - padding : dstRect.x + dstRect.width + padding,
        y: dst.y + dirY * escapeOffset
      };
    }
  } else {
    cp2 = offsetForEdge(dst, dstEdge, dVal);
  }
  if (obstacles && obstacles.length > 0) {
    const PAD = 24; // tighter collision padding to avoid false positives

    // Corridor bounding box: only obstacles that lie BETWEEN src and dst matter.
    // Expand by PAD in all directions so nearby entities aren't wrongly flagged.
    const corridorX1 = Math.min(src.x, dst.x) - PAD;
    const corridorX2 = Math.max(src.x, dst.x) + PAD;
    const corridorY1 = Math.min(src.y, dst.y) - PAD;
    const corridorY2 = Math.max(src.y, dst.y) + PAD;

    // Sample 9 interior points along the initial bezier to detect collisions
    const sample = (t: number) => {
      const mt = 1 - t;
      return {
        x: mt*mt*mt*src.x + 3*mt*mt*t*cp1.x + 3*mt*t*t*cp2.x + t*t*t*dst.x,
        y: mt*mt*mt*src.y + 3*mt*mt*t*cp1.y + 3*mt*t*t*cp2.y + t*t*t*dst.y,
      };
    };

    // Find the obstacle that the curve penetrates most (most sampled points inside)
    let worstObs: { x: number; y: number; width: number; height: number } | undefined;
    let worstOverlap = 0;

    for (const obs of obstacles) {
      // Skip source rect
      if (srcRect &&
          obs.x < srcRect.x + srcRect.width + 2 && obs.x + obs.width > srcRect.x - 2 &&
          obs.y < srcRect.y + srcRect.height + 2 && obs.y + obs.height > srcRect.y - 2) continue;
      // Skip destination rect
      if (dstRect &&
          obs.x < dstRect.x + dstRect.width + 2 && obs.x + obs.width > dstRect.x - 2 &&
          obs.y < dstRect.y + dstRect.height + 2 && obs.y + obs.height > dstRect.y - 2) continue;

      // Skip if obstacle lies fully outside the corridor between src and dst
      if (obs.x + obs.width < corridorX1 || obs.x > corridorX2 ||
          obs.y + obs.height < corridorY1 || obs.y > corridorY2) continue;

      const ox1 = obs.x - PAD, ox2 = obs.x + obs.width + PAD;
      const oy1 = obs.y - PAD, oy2 = obs.y + obs.height + PAD;

      let hits = 0;
      for (let i = 1; i <= 9; i++) {
        const p = sample(i / 10);
        if (p.x > ox1 && p.x < ox2 && p.y > oy1 && p.y < oy2) hits++;
      }
      if (hits > worstOverlap) {
        worstOverlap = hits;
        worstObs = obs;
      }
    }

    // If an obstacle was found in the corridor, compute a perpendicular bypass
    if (worstObs) {
      const obs = worstObs;
      const BYPASS_PAD = 50; // clearance beyond the obstacle bounding box

      // Midpoint X of the two anchor points — route the arc through there
      const midX = (src.x + dst.x) / 2;

      // Choose above or below the obstacle:
      // - If both endpoints are clearly above centre → always go above
      // - If both endpoints are clearly below centre → always go below
      // - Otherwise pick whichever direction requires less vertical travel from src
      const obsCenterY = obs.y + obs.height / 2;
      let routeAbove: boolean;
      if (src.y <= obsCenterY && dst.y <= obsCenterY) {
        routeAbove = true;
      } else if (src.y >= obsCenterY && dst.y >= obsCenterY) {
        routeAbove = false;
      } else {
        // Mixed: pick the shorter detour
        routeAbove =
          Math.abs(src.y - (obs.y - BYPASS_PAD)) <
          Math.abs(src.y - (obs.y + obs.height + BYPASS_PAD));
      }

      const bypassY = routeAbove
        ? obs.y - BYPASS_PAD
        : obs.y + obs.height + BYPASS_PAD;

      // Redirect both control points through the bypass waypoint
      cp1 = { x: midX, y: bypassY };
      cp2 = { x: midX, y: bypassY };
    }
  }

  return { cp1, cp2 };
};

export const bezierPath = (
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
  const { cp1, cp2 } = getBezierControlPoints(src, srcEdge, dst, inferredDstEdge, srcRect, dstRect, undefined, obstacles);
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

const routeHalf = (
  start: { x: number; y: number },
  edge: EdgePosition,
  rect: { x: number; y: number; width: number; height: number } | undefined,
  target: { x: number; y: number }
): { x: number; y: number }[] => {
  const pts: { x: number; y: number }[] = [start];
  if (!rect) {
    if (edge === 'left' || edge === 'right') {
      pts.push({ x: target.x, y: start.y });
    } else {
      pts.push({ x: start.x, y: target.y });
    }
    pts.push(target);
    return pts;
  }

  // Escape point
  const escapeDist = 24;
  let p1 = { x: start.x, y: start.y };
  if (edge === 'top') p1.y -= escapeDist;
  else if (edge === 'bottom') p1.y += escapeDist;
  else if (edge === 'left') p1.x -= escapeDist;
  else if (edge === 'right') p1.x += escapeDist;
  pts.push(p1);

  // Bounding box with padding
  const padding = 12;
  const bMinX = rect.x - padding;
  const bMaxX = rect.x + rect.width + padding;
  const bMinY = rect.y - padding;
  const bMaxY = rect.y + rect.height + padding;

  const intersectsBox = (a: {x: number; y: number}, b: {x: number; y: number}) => {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return (minX < bMaxX && maxX > bMinX && minY < bMaxY && maxY > bMinY);
  };

  const cornerA = { x: target.x, y: p1.y }; // horizontal first
  const cornerB = { x: p1.x, y: target.y }; // vertical first

  const pathAFree = !intersectsBox(p1, cornerA) && !intersectsBox(cornerA, target);
  const pathBFree = !intersectsBox(p1, cornerB) && !intersectsBox(cornerB, target);

  if (edge === 'left' || edge === 'right') {
    if (pathAFree) {
      pts.push(cornerA);
    } else if (pathBFree) {
      pts.push(cornerB);
    } else {
      // Wrap around the entity box boundaries
      const goTop = target.y < rect.y + rect.height / 2;
      const cornerY = goTop ? bMinY : bMaxY;
      const escapeX = edge === 'left' ? bMinX : bMaxX;
      const targetSideX = edge === 'left' ? bMaxX : bMinX;

      pts.push({ x: escapeX, y: cornerY });
      pts.push({ x: targetSideX, y: cornerY });
      pts.push({ x: targetSideX, y: target.y });
    }
  } else {
    // top or bottom
    if (pathBFree) {
      pts.push(cornerB);
    } else if (pathAFree) {
      pts.push(cornerA);
    } else {
      // Wrap around the entity box boundaries
      const goLeft = target.x < rect.x + rect.width / 2;
      const cornerX = goLeft ? bMinX : bMaxX;
      const escapeY = edge === 'top' ? bMinY : bMaxY;
      const targetSideY = edge === 'top' ? bMaxY : bMinY;

      pts.push({ x: cornerX, y: escapeY });
      pts.push({ x: cornerX, y: targetSideY });
      pts.push({ x: target.x, y: targetSideY });
    }
  }

  pts.push(target);
  return pts;
};

export const getOrthogonalPoints = (
  src: { x: number; y: number },
  srcEdge: EdgePosition,
  dst: { x: number; y: number },
  dstEdge?: EdgePosition,
  srcRect?: { x: number; y: number; width: number; height: number },
  dstRect?: { x: number; y: number; width: number; height: number },
  obstacles?: { x: number; y: number; width: number; height: number }[]
): { x: number; y: number }[] => {
  const inferredDstEdge: EdgePosition = dstEdge ?? (
    srcEdge === 'top'    ? 'bottom' :
    srcEdge === 'bottom' ? 'top'    :
    srcEdge === 'left'   ? 'right'  : 'left'
  );

  if (obstacles && obstacles.length > 0) {
    const route = computeAStarOrthogonalRoute(src, srcEdge, dst, inferredDstEdge, obstacles, srcRect, dstRect);
    return cleanCollinearPoints(route);
  }

  const midpoint = {
    x: (src.x + dst.x) / 2,
    y: (src.y + dst.y) / 2
  };

  const firstHalf = routeHalf(src, srcEdge, srcRect, midpoint);
  const secondHalf = routeHalf(dst, inferredDstEdge, dstRect, midpoint);

  let combined = [...firstHalf, ...secondHalf.slice().reverse().slice(1)];
  combined = cleanCollinearPoints(combined);

  // Post-process: if any H or V segment crosses an obstacle, insert a bypass.
  // Only check obstacles that are not src/dst rects.
  if (obstacles && obstacles.length > 0) {
    const PAD = 18;
    const bypassPad = 36;
    const filteredObs = obstacles.filter(obs => {
      if (srcRect &&
          obs.x < srcRect.x + srcRect.width + 2 && obs.x + obs.width > srcRect.x - 2 &&
          obs.y < srcRect.y + srcRect.height + 2 && obs.y + obs.height > srcRect.y - 2) return false;
      if (dstRect &&
          obs.x < dstRect.x + dstRect.width + 2 && obs.x + obs.width > dstRect.x - 2 &&
          obs.y < dstRect.y + dstRect.height + 2 && obs.y + obs.height > dstRect.y - 2) return false;
      return true;
    });

    if (filteredObs.length > 0) {
      const result: { x: number; y: number }[] = [];
      for (let i = 0; i < combined.length - 1; i++) {
        const a = combined[i]!;
        const b = combined[i + 1]!;
        result.push(a);

        // Horizontal segment
        if (Math.abs(a.y - b.y) < 1) {
          const x1 = Math.min(a.x, b.x);
          const x2 = Math.max(a.x, b.x);
          const y = a.y;
          for (const obs of filteredObs) {
            const ox1 = obs.x - PAD, ox2 = obs.x + obs.width + PAD;
            const oy1 = obs.y - PAD, oy2 = obs.y + obs.height + PAD;
            if (x1 < ox2 && x2 > ox1 && y > oy1 && y < oy2) {
              // Segment crosses this obstacle: route above or below
              const aboveY = obs.y - bypassPad;
              const belowY = obs.y + obs.height + bypassPad;
              const detourY = Math.abs(y - aboveY) < Math.abs(y - belowY) ? aboveY : belowY;
              const midX = (a.x + b.x) / 2;
              result.push({ x: a.x, y: detourY });
              result.push({ x: midX, y: detourY });
              result.push({ x: b.x, y: detourY });
              break; // one bypass per segment is enough
            }
          }
        }

        // Vertical segment
        if (Math.abs(a.x - b.x) < 1) {
          const y1 = Math.min(a.y, b.y);
          const y2 = Math.max(a.y, b.y);
          const x = a.x;
          for (const obs of filteredObs) {
            const ox1 = obs.x - PAD, ox2 = obs.x + obs.width + PAD;
            const oy1 = obs.y - PAD, oy2 = obs.y + obs.height + PAD;
            if (y1 < oy2 && y2 > oy1 && x > ox1 && x < ox2) {
              const leftX = obs.x - bypassPad;
              const rightX = obs.x + obs.width + bypassPad;
              const detourX = Math.abs(x - leftX) < Math.abs(x - rightX) ? leftX : rightX;
              const midY = (a.y + b.y) / 2;
              result.push({ x: detourX, y: a.y });
              result.push({ x: detourX, y: midY });
              result.push({ x: detourX, y: b.y });
              break;
            }
          }
        }
      }
      result.push(combined[combined.length - 1]!);
      return cleanCollinearPoints(result);
    }
  }

  return combined;
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
  const pts = getOrthogonalPoints(src, srcEdge, dst, dstEdge, srcRect, dstRect, obstacles);
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
  const { cp1, cp2 } = getBezierControlPoints(src, srcEdge, dst, inferredDstEdge, srcRect, dstRect, undefined, obstacles);

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
  const pts = getOrthogonalPoints(src, srcEdge, dst, dstEdge, srcRect, dstRect, obstacles);
  
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
  return bezierMidpoint(src, srcEdge, dst, dstEdge, srcRect, dstRect, obstacles);
};