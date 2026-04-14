import type { Signal } from '@atomos-web/prime'
import { createSignal } from '@atomos-web/prime'
import type { RenderType } from '@atomos-web/structura-core'
import type { EdgePosition } from '../features/edge/types/edge.types.js'
import { bezierPath, linearPath, orthogonalPath } from './bezier.js'

export interface LinkProps {
  readonly id: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly sourcePosition: { x: number; y: number };
  readonly targetPosition: { x: number; y: number };
  readonly sourceEdge?: EdgePosition;
  readonly targetEdge?: EdgePosition;
  readonly temporary?: boolean;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly animated?: boolean;
  readonly renderType?: RenderType;
}

export interface LinkResult {
  readonly element: SVGPathElement;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly updatePath: (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, srcEdge?: EdgePosition, dstEdge?: EdgePosition, renderType?: RenderType, srcRect?: { x: number; y: number; width: number; height: number }, dstRect?: { x: number; y: number; width: number; height: number }) => void;
  readonly setTemporary: (temporary: boolean) => void;
  readonly setValidity: (isValid: boolean) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export interface LinkManager {
  readonly links: Signal<Map<string, LinkResult>>;
  readonly createLink: (props: LinkProps) => LinkResult;
  readonly updateLinkPath: (linkId: string, sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, srcEdge?: EdgePosition, dstEdge?: EdgePosition, renderType?: RenderType, srcRect?: { x: number; y: number; width: number; height: number }, dstRect?: { x: number; y: number; width: number; height: number }) => void;
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
    path.setAttribute('stroke', props.strokeColor ?? '#374151');
    path.setAttribute('stroke-width', (props.strokeWidth ?? 2).toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    if (!props.temporary) path.setAttribute('class', 'vbs-link');
    path.style.pointerEvents = 'stroke';
    path.style.cursor = 'pointer';
    path.style.transition = 'stroke-width 0.15s ease, opacity 0.15s ease';

    // Inject animation keyframe once
    if (!document.querySelector('#vbs-link-anim')) {
      const style = document.createElement('style');
      style.id = 'vbs-link-anim';
      style.textContent = '@keyframes vbs-dash{to{stroke-dashoffset:-10}}';
      document.head.appendChild(style);
    }

    if (props.temporary) {
      path.setAttribute('stroke-dasharray', '6,4');
      path.setAttribute('opacity', '0.75');
      path.style.pointerEvents = 'none'; // must not block hover on destination edges during draw
      if (props.animated) path.style.animation = 'vbs-dash 0.6s linear infinite';
    }

    let currentRenderType = props.renderType;

    const updatePath = (
      sourcePos: { x: number; y: number },
      targetPos: { x: number; y: number },
      srcEdge?: EdgePosition,
      dstEdge?: EdgePosition,
      renderType?: RenderType,
      srcRect?: { x: number; y: number; width: number; height: number },
      dstRect?: { x: number; y: number; width: number; height: number }
    ) => {
      const src = srcEdge ?? props.sourceEdge ?? 'right';
      const dst = dstEdge ?? props.targetEdge;
      if (renderType) {
        currentRenderType = renderType;
      }
      const type = currentRenderType ?? 'bezier';
      
      let d = '';
      if (type === 'linear') {
        d = linearPath(sourcePos, targetPos);
      } else if (type === 'orthogonal') {
        d = orthogonalPath(sourcePos, src, targetPos, dst, srcRect, dstRect);
      } else {
        d = bezierPath(sourcePos, src, targetPos, dst);
      }
      
      path.setAttribute('d', d);
    };

    const setTemporary = (temporary: boolean) => {
      if (temporary) {
        path.setAttribute('stroke-dasharray', '6,4');
        path.setAttribute('opacity', '0.75');
        if (props.animated) path.style.animation = 'vbs-dash 0.6s linear infinite';
      } else {
        path.removeAttribute('stroke-dasharray');
        path.setAttribute('opacity', '1');
        path.style.animation = '';
      }
    };

    // Hover highlight — only on permanent links
    if (!props.temporary) {
      const baseStroke = props.strokeColor ?? '#374151';
      const baseWidth  = (props.strokeWidth ?? 2).toString();
      path.addEventListener('mouseenter', () => {
        path.setAttribute('stroke', '#818cf8');
        path.setAttribute('stroke-width', '4');
        path.setAttribute('opacity', '1');
      });
      path.addEventListener('mouseleave', () => {
        path.setAttribute('stroke', baseStroke);
        path.setAttribute('stroke-width', baseWidth);
        path.setAttribute('opacity', '1');
      });
    }

    const setValidity = (isValid: boolean) => {
      if (isValid) {
        path.setAttribute('stroke', props.strokeColor ?? 'var(--vbs-text-primary, #f4f4f5)'); // default bright color
      } else {
        path.setAttribute('stroke', '#ef4444'); // red-500
      }
    };

    updatePath(props.sourcePosition, props.targetPosition);

    const linkResult: LinkResult = {
      element: path,
      sourceAnchorId: props.sourceAnchorId,
      ...(props.targetAnchorId !== undefined ? { targetAnchorId: props.targetAnchorId } : {}),
      updatePath,
      setTemporary,
      setValidity,
      cleanup: {
        destroy: () => {
          if (path.parentNode) path.parentNode.removeChild(path);
        }
      }
    };

    const currentLinks = new Map(links.value);
    currentLinks.set(props.id, linkResult);
    links.set(currentLinks);

    return linkResult;
  };

  // Update existing link path
  const updateLinkPath = (linkId: string, sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, srcEdge?: EdgePosition, dstEdge?: EdgePosition, renderType?: RenderType, srcRect?: { x: number; y: number; width: number; height: number }, dstRect?: { x: number; y: number; width: number; height: number }) => {
    const link = links.value.get(linkId);
    if (link) link.updatePath(sourcePos, targetPos, srcEdge, dstEdge, renderType, srcRect, dstRect);
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