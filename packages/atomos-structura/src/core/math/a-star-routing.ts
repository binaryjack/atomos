import type { EdgePosition } from '../../features/edge/types/edge.types.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

// Priority Queue for A* algorithm
class MinHeap<T> {
  private heap: T[] = [];
  constructor(private scoreFunction: (element: T) => number) {}

  push(element: T) {
    this.heap.push(element);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    const result = this.heap[0];
    const end = this.heap.pop();
    if (this.heap.length > 0 && end !== undefined) {
      this.heap[0] = end;
      this.sinkDown(0);
    }
    return result;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  private bubbleUp(n: number) {
    const element = this.heap[n]!;
    const score = this.scoreFunction(element);
    while (n > 0) {
      const parentN = Math.floor((n + 1) / 2) - 1;
      const parent = this.heap[parentN]!;
      if (score >= this.scoreFunction(parent)) break;
      this.heap[parentN] = element;
      this.heap[n] = parent;
      n = parentN;
    }
  }

  private sinkDown(n: number) {
    const length = this.heap.length;
    const element = this.heap[n]!;
    const elemScore = this.scoreFunction(element);

    while (true) {
      const child2N = (n + 1) * 2;
      const child1N = child2N - 1;
      let swap = null;
      let child1Score = 0;

      if (child1N < length) {
        const child1 = this.heap[child1N]!;
        child1Score = this.scoreFunction(child1);
        if (child1Score < elemScore) swap = child1N;
      }
      if (child2N < length) {
        const child2 = this.heap[child2N]!;
        const child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score)) swap = child2N;
      }

      if (swap == null) break;
      this.heap[n] = this.heap[swap]!;
      this.heap[swap] = element;
      n = swap;
    }
  }
}

interface AStarState {
  x: number;
  y: number;
  dx: number; // current direction X (-1, 0, 1)
  dy: number; // current direction Y (-1, 0, 1)
  gScore: number; // cost from start
  fScore: number; // estimated total cost
  path: Point[];
}

const getEscapePoint = (pt: Point, edge: EdgePosition, escapeDist: number): Point => {
  switch (edge) {
    case 'top': return { x: pt.x, y: pt.y - escapeDist };
    case 'bottom': return { x: pt.x, y: pt.y + escapeDist };
    case 'left': return { x: pt.x - escapeDist, y: pt.y };
    case 'right': return { x: pt.x + escapeDist, y: pt.y };
  }
};

const BEND_PENALTY = 500;
const ESCAPE_DIST = 25;
const PADDING = 15; // Distance to keep away from obstacles

// Check if line segment intersects any padded obstacle
const intersectsAnyObstacle = (p1: Point, p2: Point, obstacles: Rect[]): boolean => {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  // If it's a point, ignore segment check
  if (minX === maxX && minY === maxY) return false;

  for (const obs of obstacles) {
    // Padded obstacle bounds
    const ox1 = obs.x - PADDING;
    const ox2 = obs.x + obs.width + PADDING;
    const oy1 = obs.y - PADDING;
    const oy2 = obs.y + obs.height + PADDING;

    // A segment intersects the padded box if it crosses it
    if (minX < ox2 && maxX > ox1 && minY < oy2 && maxY > oy1) {
      // Further restrict: if line is horizontal
      if (minY === maxY) {
        if (minY > oy1 && minY < oy2) return true;
      }
      // If line is vertical
      else if (minX === maxX) {
        if (minX > ox1 && minX < ox2) return true;
      }
    }
  }
  return false;
};

// Main routing function
export const computeAStarOrthogonalRoute = (
  src: Point,
  srcEdge: EdgePosition,
  dst: Point,
  dstEdge: EdgePosition,
  obstacles: Rect[],
  srcRect?: Rect,
  dstRect?: Rect
): Point[] => {
  
  // Create escape points to force the link out of the source/target correctly
  const escapeSrc = getEscapePoint(src, srcEdge, ESCAPE_DIST);
  const escapeDst = getEscapePoint(dst, dstEdge, ESCAPE_DIST);

  // Collect all unique grid lines (X and Y coordinates)
  const xs = new Set<number>([src.x, escapeSrc.x, dst.x, escapeDst.x]);
  const ys = new Set<number>([src.y, escapeSrc.y, dst.y, escapeDst.y]);

  for (const obs of obstacles) {
    // Exclude source and destination rects from the obstacle check completely
    if (srcRect && Math.abs(obs.x - srcRect.x) < 1 && Math.abs(obs.y - srcRect.y) < 1) continue;
    if (dstRect && Math.abs(obs.x - dstRect.x) < 1 && Math.abs(obs.y - dstRect.y) < 1) continue;

    xs.add(obs.x - PADDING);
    xs.add(obs.x + obs.width + PADDING);
    ys.add(obs.y - PADDING);
    ys.add(obs.y + obs.height + PADDING);
  }

  const xCoords = Array.from(xs).sort((a, b) => a - b);
  const yCoords = Array.from(ys).sort((a, b) => a - b);

  // We only care about paths between escapeSrc and escapeDst on this grid.
  // The actual final path will be [src, ...aStarPath, dst]

  const openList = new MinHeap<AStarState>(s => s.fScore);
  const visited = new Map<string, number>();

  const startDx = Math.sign(escapeSrc.x - src.x);
  const startDy = Math.sign(escapeSrc.y - src.y);

  openList.push({
    x: escapeSrc.x,
    y: escapeSrc.y,
    dx: startDx,
    dy: startDy,
    gScore: 0,
    fScore: Math.abs(escapeDst.x - escapeSrc.x) + Math.abs(escapeDst.y - escapeSrc.y),
    path: [escapeSrc]
  });

  let bestPath: Point[] | null = null;

  while (!openList.isEmpty()) {
    const current = openList.pop()!;

    if (current.x === escapeDst.x && current.y === escapeDst.y) {
      bestPath = current.path;
      break;
    }

    const stateKey = `${current.x},${current.y},${current.dx},${current.dy}`;
    if (visited.has(stateKey) && visited.get(stateKey)! <= current.gScore) {
      continue;
    }
    visited.set(stateKey, current.gScore);

    // Generate neighbors on the grid
    const neighbors: Point[] = [];
    
    const xIndex = xCoords.indexOf(current.x);
    if (xIndex > 0) neighbors.push({ x: xCoords[xIndex - 1]!, y: current.y });
    if (xIndex < xCoords.length - 1) neighbors.push({ x: xCoords[xIndex + 1]!, y: current.y });

    const yIndex = yCoords.indexOf(current.y);
    if (yIndex > 0) neighbors.push({ x: current.x, y: yCoords[yIndex - 1]! });
    if (yIndex < yCoords.length - 1) neighbors.push({ x: current.x, y: yCoords[yIndex + 1]! });

    for (const next of neighbors) {
      // Check collision
      const relevantObstacles = obstacles.filter(obs => {
        // Exclude src and dst from strict obstacle checking for their escape segments
        if (srcRect && Math.abs(obs.x - srcRect.x) < 1 && Math.abs(obs.y - srcRect.y) < 1) return false;
        if (dstRect && Math.abs(obs.x - dstRect.x) < 1 && Math.abs(obs.y - dstRect.y) < 1) return false;
        return true;
      });

      if (intersectsAnyObstacle(current, next, relevantObstacles)) {
        continue;
      }

      const dx = Math.sign(next.x - current.x);
      const dy = Math.sign(next.y - current.y);
      
      // Calculate costs
      const dist = Math.abs(next.x - current.x) + Math.abs(next.y - current.y);
      
      // Penalty if direction changes
      const isTurn = (current.dx !== 0 || current.dy !== 0) && (dx !== current.dx || dy !== current.dy);
      const bendCost = isTurn ? BEND_PENALTY : 0;
      
      const newGScore = current.gScore + dist + bendCost;
      
      // Heuristic (Manhattan + estimated bends to target)
      // If we are moving away from target on an axis, add penalty to guide it efficiently
      const hDist = Math.abs(escapeDst.x - next.x) + Math.abs(escapeDst.y - next.y);
      let hBends = 0;
      if (next.x !== escapeDst.x && dx === 0) hBends += BEND_PENALTY;
      if (next.y !== escapeDst.y && dy === 0) hBends += BEND_PENALTY;
      
      const newFScore = newGScore + hDist + hBends;

      openList.push({
        x: next.x,
        y: next.y,
        dx,
        dy,
        gScore: newGScore,
        fScore: newFScore,
        path: [...current.path, next]
      });
    }
  }

  if (bestPath) {
    return [src, ...bestPath, dst];
  }

  // Fallback: If no path found (completely blocked), just draw L-shape
  return [src, escapeSrc, escapeDst, dst];
};
