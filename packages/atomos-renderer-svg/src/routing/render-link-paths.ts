export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LinkGeometryOptions {
  readonly src: Point;
  readonly dst: Point;
  readonly style?: 'bezier' | 'orthogonal' | 'straight' | 'linear';
  readonly waypoints?: readonly Point[];
}

export function computeLinkSvgPath(opts: LinkGeometryOptions): { pathData: string; midX: number; midY: number } {
  const { src, dst, style = 'bezier', waypoints } = opts;

  // 1. If waypoints exist, construct multi-point path
  if (waypoints && waypoints.length > 0) {
    const pts = [src, ...waypoints, dst];
    let d = `M ${pts[0]!.x} ${pts[0]!.y}`;

    if (style === 'orthogonal') {
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i]!;
        const p2 = pts[i + 1]!;
        const midX = (p1.x + p2.x) / 2;
        d += ` L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
      }
    } else {
      // Smooth curve through waypoints
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i]!;
        const p2 = pts[i + 1]!;
        const dx = (p2.x - p1.x) * 0.5;
        d += ` C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
      }
    }

    const midIndex = Math.floor(pts.length / 2);
    const midPoint = pts[midIndex]!;
    return { pathData: d, midX: midPoint.x, midY: midPoint.y };
  }

  // 2. Straight line
  if (style === 'straight' || style === 'linear') {
    return {
      pathData: `M ${src.x} ${src.y} L ${dst.x} ${dst.y}`,
      midX: (src.x + dst.x) / 2,
      midY: (src.y + dst.y) / 2,
    };
  }

  // 3. Orthogonal link
  if (style === 'orthogonal') {
    const midX = (src.x + dst.x) / 2;
    return {
      pathData: `M ${src.x} ${src.y} L ${midX} ${src.y} L ${midX} ${dst.y} L ${dst.x} ${dst.y}`,
      midX,
      midY: (src.y + dst.y) / 2,
    };
  }

  // 4. Default Cubic Bézier curve
  const dx = Math.abs(dst.x - src.x) * 0.5;
  const cp1x = src.x < dst.x ? src.x + dx : src.x - dx;
  const cp2x = src.x < dst.x ? dst.x - dx : dst.x + dx;

  return {
    pathData: `M ${src.x} ${src.y} C ${cp1x} ${src.y}, ${cp2x} ${dst.y}, ${dst.x} ${dst.y}`,
    midX: (src.x + dst.x) / 2,
    midY: (src.y + dst.y) / 2,
  };
}
