import type { EdgePosition } from '../../features/edge/types/edge.types.js';

export interface RoutingObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoutingPoint {
  x: number;
  y: number;
}

class PriorityQueue<T> {
  private elements: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number) {
    this.elements.push({ item, priority });
    this.elements.sort((a, b) => a.priority - b.priority); // Simple for small grids
  }

  dequeue(): T | undefined {
    return this.elements.shift()?.item;
  }

  isEmpty(): boolean {
    return this.elements.length === 0;
  }
}

const PADDING = 24;
const PENALTY_BEND = 10;

function isSegmentBlocked(p1: RoutingPoint, p2: RoutingPoint, obstacles: RoutingObstacle[]): boolean {
  for (const obs of obstacles) {
    const ox1 = obs.x - PADDING + 2; 
    const ox2 = obs.x + obs.width + PADDING - 2;
    const oy1 = obs.y - PADDING + 2;
    const oy2 = obs.y + obs.height + PADDING - 2;
    
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    
    if (maxX >= ox1 && minX <= ox2 && maxY >= oy1 && minY <= oy2) {
      if (p1.x === p2.x) { // vertical
        if (p1.x > ox1 && p1.x < ox2) return true;
      } else if (p1.y === p2.y) { // horizontal
        if (p1.y > oy1 && p1.y < oy2) return true;
      }
    }
  }
  return false;
}

function cleanCollinearPoints(pts: RoutingPoint[]): RoutingPoint[] {
  if (pts.length <= 2) return pts;
  
  const cleanPts = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = cleanPts[cleanPts.length - 1]!;
    const curr = pts[i]!;
    const next = pts[i + 1]!;
    
    if ((prev.x === curr.x && curr.x === next.x) || (prev.y === curr.y && curr.y === next.y)) {
      continue;
    }
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
}

export function routeAStar(
  src: RoutingPoint,
  srcEdge: EdgePosition,
  dst: RoutingPoint,
  dstEdge: EdgePosition,
  obstacles: RoutingObstacle[]
): RoutingPoint[] {
  const xs = new Set<number>();
  const ys = new Set<number>();
  
  const startOffset = { ...src };
  if (srcEdge === 'top') startOffset.y -= PADDING;
  if (srcEdge === 'bottom') startOffset.y += PADDING;
  if (srcEdge === 'left') startOffset.x -= PADDING;
  if (srcEdge === 'right') startOffset.x += PADDING;
  
  const endOffset = { ...dst };
  if (dstEdge === 'top') endOffset.y -= PADDING;
  if (dstEdge === 'bottom') endOffset.y += PADDING;
  if (dstEdge === 'left') endOffset.x -= PADDING;
  if (dstEdge === 'right') endOffset.x += PADDING;
  
  const addP = (x: number, y: number) => { xs.add(x); ys.add(y); };
  
  addP(src.x, src.y);
  addP(startOffset.x, startOffset.y);
  addP(dst.x, dst.y);
  addP(endOffset.x, endOffset.y);
  
  // Add bbox edges and center lines for better routing
  for (const obs of obstacles) {
    xs.add(obs.x - PADDING);
    xs.add(obs.x + obs.width + PADDING);
    ys.add(obs.y - PADDING);
    ys.add(obs.y + obs.height + PADDING);
  }
  
  const xArr = Array.from(xs).sort((a, b) => a - b);
  const yArr = Array.from(ys).sort((a, b) => a - b);
  
  const gridNodes = new Map<string, {x: number, y: number}>();
  for (const x of xArr) {
    for (const y of yArr) {
      gridNodes.set(`${x},${y}`, {x, y});
    }
  }

  const startKey = `${startOffset.x},${startOffset.y}`;
  const endKey = `${endOffset.x},${endOffset.y}`;
  
  const openSet = new PriorityQueue<string>();
  openSet.enqueue(startKey, 0);
  
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);
  
  const getNeighbors = (key: string): string[] => {
    const parts = key.split(',');
    const xsNum = Number(parts[0]);
    const ysNum = Number(parts[1]);
    const xi = xArr.indexOf(xsNum);
    const yi = yArr.indexOf(ysNum);
    const neighbors: string[] = [];
    if (xi > 0) neighbors.push(`${xArr[xi - 1]},${ysNum}`);
    if (xi < xArr.length - 1) neighbors.push(`${xArr[xi + 1]},${ysNum}`);
    if (yi > 0) neighbors.push(`${xsNum},${yArr[yi - 1]}`);
    if (yi < yArr.length - 1) neighbors.push(`${xsNum},${yArr[yi + 1]}`);
    return neighbors;
  };
  
  let found = false;
  
  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;
    if (current === endKey) {
      found = true;
      break;
    }
    
    const currNode = gridNodes.get(current)!;
    const neighbors = getNeighbors(current);
    
    for (const neighbor of neighbors) {
      const neighborNode = gridNodes.get(neighbor)!;
      
      if (isSegmentBlocked(currNode, neighborNode, obstacles)) {
        continue;
      }
      
      const dist = Math.abs(currNode.x - neighborNode.x) + Math.abs(currNode.y - neighborNode.y);
      let bendPenalty = 0;
      
      if (cameFrom.has(current)) {
        const prev = gridNodes.get(cameFrom.get(current)!)!;
        const wasHorizontal = prev.y === currNode.y;
        const isHorizontal = currNode.y === neighborNode.y;
        if (wasHorizontal !== isHorizontal) {
          bendPenalty = PENALTY_BEND;
        }
      } else {
        // Enforce initial direction matching srcEdge
        if (srcEdge === 'top' || srcEdge === 'bottom') {
           if (currNode.y === neighborNode.y) bendPenalty = PENALTY_BEND * 10;
        } else {
           if (currNode.x === neighborNode.x) bendPenalty = PENALTY_BEND * 10;
        }
      }
      
      const tentativeG = gScore.get(current)! + dist + bendPenalty;
      const neighborG = gScore.get(neighbor) ?? Infinity;
      
      if (tentativeG < neighborG) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeG);
        
        const h = Math.abs(neighborNode.x - endOffset.x) + Math.abs(neighborNode.y - endOffset.y);
        openSet.enqueue(neighbor, tentativeG + h);
      }
    }
  }
  
  if (!found) {
    // Fallback: direct L-shape if no path found
    return [src, startOffset, { x: startOffset.x, y: endOffset.y }, endOffset, dst];
  }
  
  const path: RoutingPoint[] = [];
  let curr = endKey;
  while (curr !== startKey) {
    path.unshift(gridNodes.get(curr)!);
    curr = cameFrom.get(curr)!;
  }
  path.unshift(startOffset);
  
  const fullPath = [src, ...path, dst];
  return cleanCollinearPoints(fullPath);
}
