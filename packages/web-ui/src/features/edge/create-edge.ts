import type { EdgeProps, EdgeResult, EdgeState } from './types/edge.types.js';
export type { EdgeProps, EdgeResult, EdgeState };
import { createSvgRectangle } from '../svg-rectangle/create-svg-rectangle.js';
import { createAnchor } from '../anchor/create-anchor.js';
import { createSignal } from '../../core/create-signal.js';

export const createEdge = function(props: EdgeProps): EdgeResult {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  // State management for visual feedback
  const edgeState = createSignal<EdgeState>(props.state || 'default');
  cleanupFunctions.push(() => edgeState.subscribe(() => {})());
  
  Object.defineProperty(container, 'className', { 
    value: `edge edge-${props.position}`, 
    enumerable: false 
  });
  
  // Add CSS transition support
  container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  
  // Calculate edge geometry based on position
  const getEdgeGeometry = () => {
    switch (props.position) {
      case 'top':
        return { 
          x: props.x, 
          y: props.y - props.thickness, 
          width: props.width, 
          height: props.thickness 
        };
      case 'bottom':
        return { 
          x: props.x, 
          y: props.y + props.height, 
          width: props.width, 
          height: props.thickness 
        };
      case 'left':
        return { 
          x: props.x - props.thickness, 
          y: props.y, 
          width: props.thickness, 
          height: props.height 
        };
      case 'right':
        return { 
          x: props.x + props.width, 
          y: props.y, 
          width: props.thickness, 
          height: props.height 
        };
    }
  };
  
  const geometry = getEdgeGeometry();
  
  // State-based styling
  const getStateColor = (state: EdgeState) => {
    switch (state) {
      case 'default': return '#374151';
      case 'hover': return '#3b82f6';
      case 'active': return '#10b981';
      case 'connected': return '#8b5cf6';
    }
  };
  
  const getStateOpacity = (state: EdgeState) => {
    switch (state) {
      case 'default': return '0.6';
      case 'hover': return '1';
      case 'active': return '1';
      case 'connected': return '0.8';
    }
  };
  
  // Create edge visual area
  const edgeRect = createSvgRectangle({
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    fill: 'transparent',
    stroke: props.hovered ? '#3b82f6' : 'transparent',
    strokeWidth: 1,
    className: 'edge-area'
  });
  
  container.appendChild(edgeRect.element);
  cleanupFunctions.push(edgeRect.cleanup.destroy);
  
  // Calculate anchor position (center of edge)
  const getAnchorPosition = () => {
    switch (props.position) {
      case 'top':
        return { x: props.x + props.width / 2, y: props.y };
      case 'bottom':
        return { x: props.x + props.width / 2, y: props.y + props.height };
      case 'left':
        return { x: props.x, y: props.y + props.height / 2 };
      case 'right':
        return { x: props.x + props.width, y: props.y + props.height / 2 };
    }
  };
  
  const anchorPos = getAnchorPosition();
  
  // Create anchor
  const anchor = createAnchor({
    id: props.anchorId,
    position: anchorPos,
    edgePosition: props.position,
    connected: false,
    radius: 4,
    onConnect: (linkId) => {
      if (props.onAnchorConnect) {
        props.onAnchorConnect(props.anchorId, linkId);
      }
    }
  });
  
  container.appendChild(anchor.element);
  cleanupFunctions.push(anchor.cleanup.destroy);
  
  // Hover handling for edge area
  if (props.onHover) {
    const handleMouseEnter = () => props.onHover!(true);
    const handleMouseLeave = () => props.onHover!(false);
    
    edgeRect.element.addEventListener('mouseenter', handleMouseEnter);
    edgeRect.element.addEventListener('mouseleave', handleMouseLeave);
    
    listeners.push(
      { target: edgeRect.element, type: 'mouseenter', listener: handleMouseEnter },
      { target: edgeRect.element, type: 'mouseleave', listener: handleMouseLeave }
    );
  }
  
  // State update method
  const updateState = (state: EdgeState) => {
    edgeState.set(state);
    props.onStateChange?.(state);
  };
  
  return {
    element: container,
    updateState,
    cleanup: {
      destroy: () => {
        listeners.forEach(({ target, type, listener }) => {
          target.removeEventListener(type, listener);
        });
        cleanupFunctions.forEach(fn => fn());
        listeners.length = 0;
        cleanupFunctions.length = 0;
      }
    }
  };
};