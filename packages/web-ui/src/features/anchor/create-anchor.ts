import { createSignal } from '../../core/create-signal.js';
import type { AnchorProps, AnchorResult, AnchorState } from './types/anchor.types.js';
export type { AnchorProps, AnchorResult, AnchorState };

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
      case 'idle': return '#94a3b8'; // Lighter gray for idle so it sits nicely
      case 'hover': return '#4b5563';
      case 'dragging': return '#3b82f6';
      case 'connecting': return '#f59e0b';
      case 'connected': return '#10b981';
    }
  };

  const getStateOpacity = (state: AnchorState) => {
    switch (state) {
      case 'idle': return '1';
      case 'hover': return '1';
      case 'dragging': return '1';
      case 'connecting': return '1';
      case 'connected': return '1';
    }
  };

  const getStateRadius = (state: AnchorState) => {
    switch (state) {
      case 'idle': return props.radius - 3; // Shrink more so it's unobtrusive
      case 'hover': return props.radius + 6; // Grow much larger when hovered
      case 'dragging': return props.radius + 6;
      case 'connecting': return props.radius + 4;
      case 'connected': return props.radius - 3; // Stay small when connected
    }
  };

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', '2');
  circle.style.cursor = 'pointer';
  // Avoid 'all' so cx/cy don't transition, which causes dragging lag
  circle.style.transition = 'opacity 0.15s ease, fill 0.15s ease, r 0.15s ease';

  const updateCirclePosition = (pos: { x: number; y: number }) => {
    circle.setAttribute('cx', pos.x.toString());
    circle.setAttribute('cy', pos.y.toString());
  };
  updateCirclePosition(props.position.value);
  cleanupFunctions.push(props.position.subscribe(updateCirclePosition));
  
  // Apply initial state styling
  const applyStateStyles = (state: AnchorState) => {
    circle.setAttribute('fill', getStateColor(state));
    circle.setAttribute('opacity', getStateOpacity(state));
    circle.setAttribute('r', getStateRadius(state).toString());
  };
  
  anchorState.subscribe(applyStateStyles);
  applyStateStyles(anchorState.value);
  
  
  container.appendChild(circle);
  
  // State update method — edge controls show/hide externally
  const updateState = (state: AnchorState) => {
    anchorState.set(state);
    props.onStateChange?.(state);
  };

  // Only mousedown is self-managed — triggers link creation
  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    anchorState.set('dragging');
    props.onMouseDown?.(event);
  };

  // State reset — fires on any mouseup anywhere
  const handleGlobalMouseUp = () => {
    if (anchorState.value === 'dragging') {
      anchorState.set('hover');
    }
  };

  // Finalization — fires only when mouse released over THIS circle
  // This is how the workspace knows to connect to THIS anchor instead of spawning
  const handleCircleMouseUp = (event: MouseEvent) => {
    props.onMouseUp?.(event);
  };

  circle.addEventListener('mousedown', handleMouseDown);
  circle.addEventListener('mouseup', handleCircleMouseUp);
  document.addEventListener('mouseup', handleGlobalMouseUp);

  listeners.push(
    { target: circle,   type: 'mousedown', listener: handleMouseDown     as EventListener },
    { target: circle,   type: 'mouseup',   listener: handleCircleMouseUp as EventListener },
    { target: document, type: 'mouseup',   listener: handleGlobalMouseUp as EventListener }
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