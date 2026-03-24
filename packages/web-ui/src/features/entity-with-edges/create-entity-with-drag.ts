import type { EntityWithEdgesProps, EntityWithEdgesResult } from './types/entity-with-edges.types.js';
import { createInteractiveBehaviorManager } from '../../core/interactive-behavior-manager.js';
import { createSignal } from '../../core/create-signal.js';

export interface DragState {
  readonly isDragging: boolean;
  readonly startPosition: { x: number; y: number };
  readonly offset: { x: number; y: number };
}

export interface ResizeState {
  readonly isResizing: boolean;
  readonly startDimensions: { width: number; height: number };
  readonly startPosition: { x: number; y: number };
  readonly handle: 'nw' | 'ne' | 'sw' | 'se' | null;
}

export const createEntityWithEdgesDrag = function(props: EntityWithEdgesProps): EntityWithEdgesResult {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const cleanupFunctions: Array<() => void> = [];
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  
  // Behavior manager for interaction coordination
  const behaviorManager = createInteractiveBehaviorManager();
  cleanupFunctions.push(behaviorManager.cleanup.destroy);
  
  // Drag state management
  const dragState = createSignal<DragState>({
    isDragging: false,
    startPosition: { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
  });
  cleanupFunctions.push(() => dragState.subscribe(() => {})());
  
  // Resize state management
  const resizeState = createSignal<ResizeState>({
    isResizing: false,
    startDimensions: { width: 200, height: 150 },
    startPosition: { x: 0, y: 0 },
    handle: null
  });
  cleanupFunctions.push(() => resizeState.subscribe(() => {})());
  
  // Position and dimensions signals for reactive updates
  const position = typeof props.position === 'object' && 'value' in props.position 
    ? props.position 
    : createSignal(props.position as { x: number; y: number });
    
  const dimensions = typeof props.dimensions === 'object' && 'value' in props.dimensions 
    ? props.dimensions 
    : createSignal(props.dimensions as { width: number; height: number });
  
  // Entity background rectangle
  const entityRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  entityRect.setAttribute('fill', '#ffffff');
  entityRect.setAttribute('stroke', '#374151');
  entityRect.setAttribute('stroke-width', '2');
  entityRect.setAttribute('rx', '8');
  entityRect.style.cursor = 'move';
  
  // Update entity visual position and size
  const updateEntityVisuals = () => {
    const pos = position.value;
    const dims = dimensions.value;
    
    entityRect.setAttribute('x', pos.x.toString());
    entityRect.setAttribute('y', pos.y.toString());
    entityRect.setAttribute('width', dims.width.toString());
    entityRect.setAttribute('height', dims.height.toString());
    
    // Update container transform for performance
    container.setAttribute('transform', `translate(0,0)`);
  };
  
  // Subscribe to position/dimension changes
  position.subscribe(updateEntityVisuals);
  dimensions.subscribe(updateEntityVisuals);
  updateEntityVisuals();
  
  // Create resize handles
  const createResizeHandle = (handleType: 'nw' | 'ne' | 'sw' | 'se') => {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    handle.setAttribute('width', '8');
    handle.setAttribute('height', '8');
    handle.setAttribute('fill', '#3b82f6');
    handle.setAttribute('stroke', '#ffffff');
    handle.setAttribute('stroke-width', '1');
    handle.setAttribute('rx', '2');
    handle.style.cursor = `${handleType}-resize`;
    handle.style.opacity = '0';
    handle.style.transition = 'opacity 0.2s ease';
    
    // Position handle based on type
    const updateHandlePosition = () => {
      const pos = position.value;
      const dims = dimensions.value;
      
      switch (handleType) {
        case 'nw':
          handle.setAttribute('x', (pos.x - 4).toString());
          handle.setAttribute('y', (pos.y - 4).toString());
          break;
        case 'ne':
          handle.setAttribute('x', (pos.x + dims.width - 4).toString());
          handle.setAttribute('y', (pos.y - 4).toString());
          break;
        case 'sw':
          handle.setAttribute('x', (pos.x - 4).toString());
          handle.setAttribute('y', (pos.y + dims.height - 4).toString());
          break;
        case 'se':
          handle.setAttribute('x', (pos.x + dims.width - 4).toString());
          handle.setAttribute('y', (pos.y + dims.height - 4).toString());
          break;
      }
    };
    
    position.subscribe(updateHandlePosition);
    dimensions.subscribe(updateHandlePosition);
    updateHandlePosition();
    
    return handle;
  };
  
  const resizeHandles = {
    nw: createResizeHandle('nw'),
    ne: createResizeHandle('ne'),
    sw: createResizeHandle('sw'),
    se: createResizeHandle('se')
  };
  
  // Drag functionality
  const handleMouseDown = (event: MouseEvent) => {
    if (!props.draggable) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = container.getBoundingClientRect();
    const pos = position.value;
    
    dragState.set({
      isDragging: true,
      startPosition: { x: event.clientX, y: event.clientY },
      offset: { 
        x: event.clientX - pos.x, 
        y: event.clientY - pos.y 
      }
    });
    
    behaviorManager.startEntityDrag(props.id, { x: event.clientX, y: event.clientY });
    props.onDrag?.({ x: 0, y: 0 });
  };
  
  // Resize functionality
  const handleResizeMouseDown = (event: MouseEvent, handleType: 'nw' | 'ne' | 'sw' | 'se') => {
    if (!props.resizable) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    resizeState.set({
      isResizing: true,
      startDimensions: dimensions.value,
      startPosition: position.value,
      handle: handleType
    });
    
    behaviorManager.startEntityResize(props.id, { x: event.clientX, y: event.clientY });
  };
  
  // Global mouse move handler
  const handleGlobalMouseMove = (event: MouseEvent) => {
    const drag = dragState.value;
    const resize = resizeState.value;
    
    if (drag.isDragging) {
      const newPosition = {
        x: event.clientX - drag.offset.x,
        y: event.clientY - drag.offset.y
      };
      
      position.set(newPosition);
      behaviorManager.updateEntityDrag({ x: event.clientX, y: event.clientY });
      
      const delta = {
        x: event.clientX - drag.startPosition.x,
        y: event.clientY - drag.startPosition.y
      };
      props.onDrag?.(delta);
      
    } else if (resize.isResizing && resize.handle) {
      const deltaX = event.clientX - resize.startPosition.x;
      const deltaY = event.clientY - resize.startPosition.y;
      
      let newDimensions = { ...resize.startDimensions };
      let newPosition = { ...resize.startPosition };
      
      switch (resize.handle) {
        case 'se':
          newDimensions.width = Math.max(50, resize.startDimensions.width + deltaX);
          newDimensions.height = Math.max(30, resize.startDimensions.height + deltaY);
          break;
        case 'sw':
          newDimensions.width = Math.max(50, resize.startDimensions.width - deltaX);
          newDimensions.height = Math.max(30, resize.startDimensions.height + deltaY);
          newPosition.x = resize.startPosition.x + deltaX;
          break;
        case 'ne':
          newDimensions.width = Math.max(50, resize.startDimensions.width + deltaX);
          newDimensions.height = Math.max(30, resize.startDimensions.height - deltaY);
          newPosition.y = resize.startPosition.y + deltaY;
          break;
        case 'nw':
          newDimensions.width = Math.max(50, resize.startDimensions.width - deltaX);
          newDimensions.height = Math.max(30, resize.startDimensions.height - deltaY);
          newPosition.x = resize.startPosition.x + deltaX;
          newPosition.y = resize.startPosition.y + deltaY;
          break;
      }
      
      dimensions.set(newDimensions);
      position.set(newPosition);
      behaviorManager.updateEntityResize({ x: event.clientX, y: event.clientY });
      props.onResize?.(newDimensions);
    }
  };
  
  // Global mouse up handler
  const handleGlobalMouseUp = () => {
    const drag = dragState.value;
    const resize = resizeState.value;
    
    if (drag.isDragging) {
      dragState.set({
        isDragging: false,
        startPosition: { x: 0, y: 0 },
        offset: { x: 0, y: 0 }
      });
      behaviorManager.endEntityDrag();
    }
    
    if (resize.isResizing) {
      resizeState.set({
        isResizing: false,
        startDimensions: { width: 200, height: 150 },
        startPosition: { x: 0, y: 0 },
        handle: null
      });
      behaviorManager.endEntityResize();
    }
  };
  
  // Selection and hover handlers
  const handleEntityMouseEnter = () => {
    if (props.resizable) {
      Object.values(resizeHandles).forEach(handle => {
        handle.style.opacity = '1';
      });
    }
  };
  
  const handleEntityMouseLeave = () => {
    if (!resizeState.value.isResizing) {
      Object.values(resizeHandles).forEach(handle => {
        handle.style.opacity = '0';
      });
    }
  };
  
  const handleEntityClick = (event: MouseEvent) => {
    event.stopPropagation();
    behaviorManager.selectEntity(props.id);
    props.onSelect?.();
  };
  
  // Entity title
  const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  const updateTitlePosition = () => {
    const pos = position.value;
    const dims = dimensions.value;
    titleText.setAttribute('x', (pos.x + dims.width / 2).toString());
    titleText.setAttribute('y', (pos.y + 25).toString());
  };
  titleText.setAttribute('text-anchor', 'middle');
  titleText.setAttribute('class', 'fill-base-900 text-sm font-medium');
  titleText.textContent = typeof props.title === 'string' ? props.title : props.title.value;
  position.subscribe(updateTitlePosition);
  dimensions.subscribe(updateTitlePosition);
  updateTitlePosition();
  
  // Event listeners
  entityRect.addEventListener('mousedown', handleMouseDown);
  entityRect.addEventListener('mouseenter', handleEntityMouseEnter);
  entityRect.addEventListener('mouseleave', handleEntityMouseLeave);
  entityRect.addEventListener('click', handleEntityClick);
  
  // Resize handle event listeners
  Object.entries(resizeHandles).forEach(([handleType, handle]) => {
    handle.addEventListener('mousedown', (e) => handleResizeMouseDown(e, handleType as any));
  });
  
  // Global listeners for drag/resize
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
  
  listeners.push(
    { target: entityRect, type: 'mousedown', listener: handleMouseDown as EventListener },
    { target: entityRect, type: 'mouseenter', listener: handleEntityMouseEnter },
    { target: entityRect, type: 'mouseleave', listener: handleEntityMouseLeave },
    { target: entityRect, type: 'click', listener: handleEntityClick as EventListener },
    { target: document, type: 'mousemove', listener: handleGlobalMouseMove as EventListener },
    { target: document, type: 'mouseup', listener: handleGlobalMouseUp }
  );
  
  // Assemble entity
  container.appendChild(entityRect);
  container.appendChild(titleText);
  
  if (props.resizable) {
    Object.values(resizeHandles).forEach(handle => {
      container.appendChild(handle);
    });
  }
  
  return {
    element: container,
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