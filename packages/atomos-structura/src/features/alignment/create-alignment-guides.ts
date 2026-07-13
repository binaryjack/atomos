/**
 * Smart Alignment Guides
 * Visual guides that appear when dragging entities to show alignment with other entities
 */

export interface AlignmentGuide {
  readonly type: 'vertical' | 'horizontal';
  readonly position: number;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly alignmentType: 'center' | 'left' | 'right' | 'top' | 'bottom';
}

export interface AlignmentGuidesResult {
  readonly element: SVGGElement;
  readonly showGuides: (guides: AlignmentGuide[]) => void;
  readonly hideGuides: () => void;
  readonly cleanup: () => void;
}

const GUIDE_COLOR = '#3b82f6'; // Blue-500
const GUIDE_OPACITY = 0.6;
const GUIDE_THICKNESS = 1;
const SNAP_THRESHOLD = 8; // pixels

export const createAlignmentGuides = function(): AlignmentGuidesResult {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  container.setAttribute('class', 'alignment-guides');
  container.style.pointerEvents = 'none';
  
  const POOL_SIZE = 10;
  const linePool: SVGLineElement[] = [];
  
  // Pre-create and style pool lines once
  for (let i = 0; i < POOL_SIZE; i++) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', GUIDE_COLOR);
    line.setAttribute('stroke-width', GUIDE_THICKNESS.toString());
    line.setAttribute('stroke-opacity', GUIDE_OPACITY.toString());
    line.setAttribute('stroke-dasharray', '4 4');
    line.style.display = 'none';
    container.appendChild(line);
    linePool.push(line);
  }
  
  const showGuides = (guides: AlignmentGuide[]): void => {
    const count = Math.min(guides.length, POOL_SIZE);
    
    for (let i = 0; i < count; i++) {
      const guide = guides[i];
      const line = linePool[i];
      if (!guide || !line) continue;
      
      if (guide.type === 'vertical') {
        line.setAttribute('x1', guide.position.toString());
        line.setAttribute('y1', '-10000');
        line.setAttribute('x2', guide.position.toString());
        line.setAttribute('y2', '10000');
      } else {
        line.setAttribute('x1', '-10000');
        line.setAttribute('y1', guide.position.toString());
        line.setAttribute('x2', '10000');
        line.setAttribute('y2', guide.position.toString());
      }
      
      line.style.display = '';
    }
    
    // Hide unused pool lines
    for (let i = count; i < POOL_SIZE; i++) {
      const line = linePool[i];
      if (line) {
        line.style.display = 'none';
      }
    }
  };
  
  const hideGuides = (): void => {
    linePool.forEach(line => {
      line.style.display = 'none';
    });
  };
  
  const cleanup = (): void => {
    hideGuides();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    linePool.length = 0;
  };
  
  return {
    element: container,
    showGuides,
    hideGuides,
    cleanup
  };
};

/**
 * Calculate alignment guides for a dragging entity
 */
export const calculateAlignmentGuides = function(
  draggingEntityId: string,
  draggingBounds: { x: number; y: number; width: number; height: number },
  otherEntities: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  snapThreshold = SNAP_THRESHOLD
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  
  const draggingCenter = {
    x: draggingBounds.x + draggingBounds.width / 2,
    y: draggingBounds.y + draggingBounds.height / 2
  };
  
  const draggingLeft = draggingBounds.x;
  const draggingRight = draggingBounds.x + draggingBounds.width;
  const draggingTop = draggingBounds.y;
  const draggingBottom = draggingBounds.y + draggingBounds.height;
  
  otherEntities.forEach(other => {
    if (other.id === draggingEntityId) return;
    
    const otherCenter = {
      x: other.x + other.width / 2,
      y: other.y + other.height / 2
    };
    
    const otherLeft = other.x;
    const otherRight = other.x + other.width;
    const otherTop = other.y;
    const otherBottom = other.y + other.height;
    
    // Vertical alignment checks
    if (Math.abs(draggingCenter.x - otherCenter.x) < snapThreshold) {
      guides.push({
        type: 'vertical',
        position: otherCenter.x,
        sourceEntityId: draggingEntityId,
        targetEntityId: other.id,
        alignmentType: 'center'
      });
    }
    
    if (Math.abs(draggingLeft - otherLeft) < snapThreshold) {
      guides.push({
        type: 'vertical',
        position: otherLeft,
        sourceEntityId: draggingEntityId,
        targetEntityId: other.id,
        alignmentType: 'left'
      });
    }
    
    if (Math.abs(draggingRight - otherRight) < snapThreshold) {
      guides.push({
        type: 'vertical',
        position: otherRight,
        sourceEntityId: draggingEntityId,
        targetEntityId: other.id,
        alignmentType: 'right'
      });
    }
    
    // Horizontal alignment checks
    if (Math.abs(draggingCenter.y - otherCenter.y) < snapThreshold) {
      guides.push({
        type: 'horizontal',
        position: otherCenter.y,
        sourceEntityId: draggingEntityId,
        targetEntityId: other.id,
        alignmentType: 'center'
      });
    }
    
    if (Math.abs(draggingTop - otherTop) < snapThreshold) {
      guides.push({
        type: 'horizontal',
        position: otherTop,
        sourceEntityId: draggingEntityId,
        targetEntityId: other.id,
        alignmentType: 'top'
      });
    }
    
    if (Math.abs(draggingBottom - otherBottom) < snapThreshold) {
      guides.push({
        type: 'horizontal',
        position: otherBottom,
        sourceEntityId: draggingEntityId,
        targetEntityId: other.id,
        alignmentType: 'bottom'
      });
    }
  });
  
  return guides;
};

/**
 * Calculate snapped position based on alignment guides
 */
export const calculateSnappedPosition = function(
  currentPos: { x: number; y: number },
  currentBounds: { width: number; height: number },
  guides: AlignmentGuide[]
): { x: number; y: number } {
  let snappedX = currentPos.x;
  let snappedY = currentPos.y;
  
  const centerX = currentPos.x + currentBounds.width / 2;
  const centerY = currentPos.y + currentBounds.height / 2;
  
  guides.forEach(guide => {
    if (guide.type === 'vertical') {
      switch (guide.alignmentType) {
        case 'center':
          snappedX = guide.position - currentBounds.width / 2;
          break;
        case 'left':
          snappedX = guide.position;
          break;
        case 'right':
          snappedX = guide.position - currentBounds.width;
          break;
      }
    } else {
      switch (guide.alignmentType) {
        case 'center':
          snappedY = guide.position - currentBounds.height / 2;
          break;
        case 'top':
          snappedY = guide.position;
          break;
        case 'bottom':
          snappedY = guide.position - currentBounds.height;
          break;
      }
    }
  });
  
  return { x: snappedX, y: snappedY };
};
