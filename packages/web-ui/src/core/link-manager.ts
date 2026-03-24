import { createSignal } from './create-signal.js';
import type { Signal } from './types/signal.types.js';

export interface LinkProps {
  readonly id: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly sourcePosition: { x: number; y: number };
  readonly targetPosition: { x: number; y: number };
  readonly temporary?: boolean;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly animated?: boolean;
}

export interface LinkResult {
  readonly element: SVGPathElement;
  readonly updatePath: (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => void;
  readonly setTemporary: (temporary: boolean) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export interface LinkManager {
  readonly links: Signal<Map<string, LinkResult>>;
  readonly createLink: (props: LinkProps) => LinkResult;
  readonly updateLinkPath: (linkId: string, sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getLink: (linkId: string) => LinkResult | undefined;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export const createLinkManager = function(): LinkManager {
  const cleanupFunctions: Array<() => void> = [];
  
  // Link storage
  const links = createSignal<Map<string, LinkResult>>(new Map());
  cleanupFunctions.push(() => links.subscribe(() => {})());

  // Create individual link
  const createLink = (props: LinkProps): LinkResult => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', `link-${props.id}`);
    path.setAttribute('stroke', props.strokeColor || '#374151');
    path.setAttribute('stroke-width', (props.strokeWidth || 2).toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.style.pointerEvents = 'stroke';
    path.style.cursor = 'pointer';
    
    // Temporary link styling
    if (props.temporary) {
      path.setAttribute('stroke-dasharray', '5,5');
      path.setAttribute('opacity', '0.7');
      if (props.animated) {
        path.style.animation = 'dash-flow 1s linear infinite';
        // Add CSS keyframe if not exists
        if (!document.querySelector('#link-animation-styles')) {
          const style = document.createElement('style');
          style.id = 'link-animation-styles';
          style.textContent = `
            @keyframes dash-flow {
              to { stroke-dashoffset: -10; }
            }
          `;
          document.head.appendChild(style);
        }
      }
    }

    // Calculate SVG path for smooth curves
    const calculatePath = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }): string => {
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Control point offset for smooth curves
      const offset = Math.min(distance * 0.3, 50);
      
      // Determine curve direction based on positions
      let cp1x: number, cp1y: number, cp2x: number, cp2y: number;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal-oriented curve
        cp1x = sourcePos.x + (dx > 0 ? offset : -offset);
        cp1y = sourcePos.y;
        cp2x = targetPos.x + (dx > 0 ? -offset : offset);
        cp2y = targetPos.y;
      } else {
        // Vertical-oriented curve  
        cp1x = sourcePos.x;
        cp1y = sourcePos.y + (dy > 0 ? offset : -offset);
        cp2x = targetPos.x;
        cp2y = targetPos.y + (dy > 0 ? -offset : offset);
      }
      
      return `M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}`;
    };

    // Update path coordinates
    const updatePath = (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => {
      const pathData = calculatePath(sourcePos, targetPos);
      path.setAttribute('d', pathData);
    };

    // Set temporary state
    const setTemporary = (temporary: boolean) => {
      if (temporary) {
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('opacity', '0.7');
        path.style.animation = props.animated ? 'dash-flow 1s linear infinite' : '';
      } else {
        path.removeAttribute('stroke-dasharray');
        path.setAttribute('opacity', '1');
        path.style.animation = '';
      }
    };

    // Initialize path
    updatePath(props.sourcePosition, props.targetPosition);

    const linkResult: LinkResult = {
      element: path,
      updatePath,
      setTemporary,
      cleanup: {
        destroy: () => {
          if (path.parentNode) {
            path.parentNode.removeChild(path);
          }
        }
      }
    };

    // Add to links map
    const currentLinks = new Map(links.value);
    currentLinks.set(props.id, linkResult);
    links.set(currentLinks);

    return linkResult;
  };

  // Update existing link path
  const updateLinkPath = (linkId: string, sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }) => {
    const link = links.value.get(linkId);
    if (link) {
      link.updatePath(sourcePos, targetPos);
    }
  };

  // Remove link
  const removeLink = (linkId: string) => {
    const link = links.value.get(linkId);
    if (link) {
      link.cleanup.destroy();
      const currentLinks = new Map(links.value);
      currentLinks.delete(linkId);
      links.set(currentLinks);
    }
  };

  // Get link by ID
  const getLink = (linkId: string): LinkResult | undefined => {
    return links.value.get(linkId);
  };

  return {
    links,
    createLink,
    updateLinkPath,
    removeLink,
    getLink,
    cleanup: {
      destroy: () => {
        // Clean up all links
        links.value.forEach(link => link.cleanup.destroy());
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};