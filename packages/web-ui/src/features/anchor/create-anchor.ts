import type { AnchorProps, AnchorResult, AnchorState } from './types/anchor.types.js';
export type { AnchorProps, AnchorResult, AnchorState };
import { createSignal } from '../../core/create-signal.js';

export const createAnchor = function(props: AnchorProps): AnchorResult {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  // State management for visual feedback
  const anchorState = createSignal<AnchorState>(props.state || (props.connected ? 'connected' : 'idle'));
  cleanupFunctions.push(() => anchorState.subscribe(() => {})());
  
  Object.defineProperty(container, 'id', { value: props.id, enumerable: false });
  Object.defineProperty(container, 'className', { 
    value: `anchor anchor-${props.edgePosition}`, 
    enumerable: false 
  });
  
  // State-based styling
  const getStateColor = (state: AnchorState) => {
    switch (state) {
      case 'idle': return '#6b7280';
      case 'hover': return '#4b5563';
      case 'dragging': return '#3b82f6';
      case 'connecting': return '#f59e0b';
      case 'connected': return '#10b981';
    }
  };
  
  const getStateOpacity = (state: AnchorState) => {
    switch (state) {
      case 'idle': return '0';
      case 'hover': return '1';
      case 'dragging': return '1';
      case 'connecting': return '1';
      case 'connected': return '1';
    }
  };
  
  const getStateRadius = (state: AnchorState) => {
    switch (state) {
      case 'idle': return props.radius;
      case 'hover': return props.radius + 2;
      case 'dragging': return props.radius + 3;
      case 'connecting': return props.radius + 2;
      case 'connected': return props.radius;
    }
  };
  
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', props.position.x.toString());
  circle.setAttribute('cy', props.position.y.toString());
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', '2');
  circle.style.cursor = 'pointer';
  circle.style.transition = 'opacity 0.2s ease, fill 0.2s ease, r 0.2s ease';
  
  // Apply initial state styling
  const applyStateStyles = (state: AnchorState) => {
    circle.setAttribute('fill', getStateColor(state));
    circle.setAttribute('opacity', getStateOpacity(state));
    circle.setAttribute('r', getStateRadius(state).toString());
  };
  
  anchorState.subscribe(applyStateStyles);
  applyStateStyles(anchorState.value);
  
  
  container.appendChild(circle);
  
  // Enhanced interaction handlers
  const handleMouseEnter = () => {
    if (anchorState.value === 'idle') {
      anchorState.set('hover');
    }
  };
  
  const handleMouseLeave = () => {
    if (anchorState.value === 'hover') {
      anchorState.set('idle');
    }
  };
  
  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (anchorState.value === 'hover' || anchorState.value === 'idle') {
      anchorState.set('dragging');
      props.onMouseDown?.(event);
    }
  };
  
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation();
    
    if (props.connected && props.onDisconnect) {
      props.onDisconnect();
    } else if (!props.connected && props.onConnect) {
      const linkId = `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      props.onConnect(linkId);
    }
  };
  
  // State update method
  const updateState = (state: AnchorState) => {
    anchorState.set(state);
    props.onStateChange?.(state);
  };
  
  
  circle.addEventListener('mouseenter', handleMouseEnter);
  circle.addEventListener('mouseleave', handleMouseLeave);
  circle.addEventListener('mousedown', handleMouseDown);
  circle.addEventListener('click', handleClick);
  
  listeners.push(
    { target: circle, type: 'mouseenter', listener: handleMouseEnter },
    { target: circle, type: 'mouseleave', listener: handleMouseLeave },
    { target: circle, type: 'mousedown', listener: handleMouseDown as EventListener },
    { target: circle, type: 'click', listener: handleClick as EventListener }
  );
  
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