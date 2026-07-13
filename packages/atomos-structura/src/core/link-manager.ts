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
  readonly direction?: 'default' | 'left' | 'right';
}

export interface LinkResult {
  readonly element: SVGPathElement;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly updatePath: (sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, srcEdge?: EdgePosition, dstEdge?: EdgePosition, renderType?: RenderType, srcRect?: { x: number; y: number; width: number; height: number }, dstRect?: { x: number; y: number; width: number; height: number }, direction?: 'default' | 'left' | 'right') => void;
  readonly setTemporary: (temporary: boolean) => void;
  readonly setValidity: (isValid: boolean) => void;
  readonly setExecutionState?: (state: any) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export interface LinkManager {
  readonly links: Signal<Map<string, LinkResult>>;
  readonly createLink: (props: LinkProps) => LinkResult;
  readonly updateLinkPath: (linkId: string, sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, srcEdge?: EdgePosition, dstEdge?: EdgePosition, renderType?: RenderType, srcRect?: { x: number; y: number; width: number; height: number }, dstRect?: { x: number; y: number; width: number; height: number }, direction?: 'default' | 'left' | 'right') => void;
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

    // Glow Filter and Marker Defs
    if (!document.getElementById('vbs-global-svg-defs')) {
      const svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgRoot.id = 'vbs-global-svg-defs';
      svgRoot.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
      svgRoot.innerHTML = `
        <defs>
          <filter id="vbs-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <marker id="vbs-arrow-left" viewBox="0 -5 10 10" refX="0" refY="0" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 10,-5 L 0,0 L 10,5 z" fill="context-stroke"></path>
          </marker>
          <marker id="vbs-arrow-right" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0,-5 L 10,0 L 0,5 z" fill="context-stroke"></path>
          </marker>
        </defs>
      `;
      document.body.appendChild(svgRoot);
    }

    // Execution Animation Container
    let animCircle: SVGCircleElement | null = null;
    let animMotion: SVGElement | null = null;

    const setExecutionState = (state: any) => {
      // Cleanup previous animations
      if (animCircle && animCircle.parentNode) {
        animCircle.parentNode.removeChild(animCircle);
      }
      animCircle = null;
      animMotion = null;
      path.style.animation = '';
      path.removeAttribute('stroke-dasharray');
      path.removeAttribute('filter');

      if (!state || !state.active) return;

      const type = state.animationType || 'flow';
      const color = state.color || '#60a5fa';
      const duration = state.duration || '2s';

      if (type === 'dash') {
        path.setAttribute('stroke-dasharray', '8,8');
        path.setAttribute('stroke', color);
        path.style.animation = `vbs-dash ${duration} linear infinite`;
      } 
      else if (type === 'pulse') {
        path.setAttribute('stroke', color);
        path.setAttribute('filter', 'url(#vbs-glow-filter)');
        // basic pulse using CSS if needed, but glow is usually enough
      }
      else if (type === 'flow') {
        path.setAttribute('stroke', color);
        path.setAttribute('filter', 'url(#vbs-glow-filter)');
        
        // Flowing dot
        animCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        animCircle.setAttribute('r', '5');
        animCircle.setAttribute('fill', '#ffffff');
        animCircle.setAttribute('filter', 'url(#vbs-glow-filter)');

        animMotion = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
        animMotion.setAttribute('dur', duration);
        animMotion.setAttribute('repeatCount', 'indefinite');
        
        const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
        mpath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#link-${props.id}`);
        
        animMotion.appendChild(mpath);
        animCircle.appendChild(animMotion);
        
        // We must append animCircle to the same parent as path
        if (path.parentNode) {
          path.parentNode.appendChild(animCircle);
        }
      }
    };

    let currentRenderType = props.renderType;

    const updatePath = (
      sourcePos: { x: number; y: number },
      targetPos: { x: number; y: number },
      srcEdge?: EdgePosition,
      dstEdge?: EdgePosition,
      renderType?: RenderType,
      srcRect?: { x: number; y: number; width: number; height: number },
      dstRect?: { x: number; y: number; width: number; height: number },
      direction?: 'default' | 'left' | 'right'
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

      const dir = direction ?? props.direction ?? 'default';
      if (dir === 'left') {
        path.setAttribute('marker-start', 'url(#vbs-arrow-left)');
        path.removeAttribute('marker-end');
      } else if (dir === 'right') {
        path.setAttribute('marker-end', 'url(#vbs-arrow-right)');
        path.removeAttribute('marker-start');
      } else {
        path.removeAttribute('marker-start');
        path.removeAttribute('marker-end');
      }
      
      if (animCircle && !animCircle.parentNode && path.parentNode) {
        path.parentNode.appendChild(animCircle);
      }
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
      setExecutionState,
      cleanup: {
        destroy: () => {
          if (path.parentNode) path.parentNode.removeChild(path);
          if (animCircle && animCircle.parentNode) animCircle.parentNode.removeChild(animCircle);
        }
      }
    };

    const currentLinks = new Map(links.value);
    currentLinks.set(props.id, linkResult);
    links.set(currentLinks);

    return linkResult;
  };

  // Update existing link path
  const updateLinkPath = (linkId: string, sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, srcEdge?: EdgePosition, dstEdge?: EdgePosition, renderType?: RenderType, srcRect?: { x: number; y: number; width: number; height: number }, dstRect?: { x: number; y: number; width: number; height: number }, direction?: 'default' | 'left' | 'right') => {
    const link = links.value.get(linkId);
    if (link) link.updatePath(sourcePos, targetPos, srcEdge, dstEdge, renderType, srcRect, dstRect, direction);
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