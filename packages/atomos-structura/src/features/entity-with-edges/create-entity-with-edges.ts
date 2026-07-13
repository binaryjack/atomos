import type { EntityWithEdgesProps, EntityWithEdgesResult } from './types/entity-with-edges.types.js';
export type { EntityWithEdgesProps, EntityWithEdgesResult };
import { createCard } from '@atomos-web/prime';
import { createTypography } from '@atomos-web/prime';
import { createButton } from '@atomos-web/prime';
import { createInput } from '@atomos-web/prime';
import { createIcon } from '@atomos-web/prime';
import { createEdge } from '../edge/create-edge.js';
import { createSignal } from '@atomos-web/prime';

export const createEntityWithEdges = function(props: EntityWithEdgesProps): EntityWithEdgesResult {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  Object.defineProperty(container, 'id', { value: props.id, enumerable: false });
  Object.defineProperty(container, 'className', { value: 'entity-with-edges', enumerable: false });
  
  // Helper functions to get current values
  const getTitle = () => typeof props.title === 'string' ? props.title : props.title.value;
  const getPosition = () => typeof props.position === 'object' && 'x' in props.position ? props.position : props.position.value;
  const getDimensions = () => typeof props.dimensions === 'object' && 'width' in props.dimensions ? props.dimensions : props.dimensions.value;
  const getProperties = () => Array.isArray(props.properties) ? props.properties : props.properties.value;
  
  let currentPosition = getPosition();
  let currentDimensions = getDimensions();

  // Normalize position/dimensions to Signal for edge subscriptions
  const positionSignal = ('set' in (props.position as object))
    ? (props.position as import('../../core/types/signal.types.js').Signal<{ x: number; y: number }>)
    : createSignal(currentPosition);
  const dimensionsSignal = ('set' in (props.dimensions as object))
    ? (props.dimensions as import('../../core/types/signal.types.js').Signal<{ width: number; height: number }>)
    : createSignal(currentDimensions);

  // Edge hover state signals
  const edgeHoverSignals = {
    top: createSignal(false),
    bottom: createSignal(false),
    left: createSignal(false),
    right: createSignal(false)
  };
  
  // Create edges around entity
  const createEntityEdges = () => {
    Object.entries(props.edges).forEach(([position, edgeConfig]) => {
      const edgePosition = position as keyof typeof props.edges;
      const hoverSignal = edgeHoverSignals[edgePosition];
      
      const edge = createEdge({
        position: edgePosition,
        entityId: props.id,
        entityPosition: positionSignal,
        entityDimensions: dimensionsSignal,
        thickness: edgeConfig.thickness,
        anchorId: edgeConfig.anchor.id,
        onHover: (hovered: boolean) => {
          hoverSignal.set(hovered);
          if (edgeConfig.onHover) edgeConfig.onHover(hovered);
        },
        onAnchorConnect: (anchorId: string, linkId: string) => {
          if (edgeConfig.anchor.onConnect) {
            edgeConfig.anchor.onConnect(linkId);
          }
        }
      });
      
      container.appendChild(edge.element);
      cleanupFunctions.push(edge.cleanup.destroy);
      
      // Subscribe to hover state changes
      const unsubscribeHover = hoverSignal.subscribe((hovered) => {
        // Edge will update its visual state automatically
      });
      cleanupFunctions.push(unsubscribeHover);
    });
  };
  
  // Create entity content container
  const entityContent = document.createElement('div');
  entityContent.className = 'entity-content';
  entityContent.style.cssText = `
    width: ${currentDimensions.width}px;
    min-height: 40px;
  `;
  
  // Create main card with header
  const headerElements: HTMLElement[] = [];
  
  // Collapse/expand button
  const toggleButton = createButton({
    variant: 'ghost',
    size: 'sm',
    children: '',
    onClick: () => {
      props.collapsed.set(!props.collapsed.value);
    }
  });
  
  const chevronIcon = createIcon({
    name: props.collapsed.value ? 'arrow-right' : 'arrow-down',
    size: 16,
    className: 'text-gray-500'
  });
  
  // Add icon to button
  toggleButton.element.innerHTML = '';
  toggleButton.element.appendChild(chevronIcon.element);
  headerElements.push(toggleButton.element);
  
  cleanupFunctions.push(toggleButton.cleanup.destroy);
  cleanupFunctions.push(chevronIcon.cleanup.destroy);
  
  const entityCard = createCard({
    title: getTitle(),
    ...(props.selected.value && { subtitle: 'Selected' }),
    children: headerElements,
    shadow: props.selected.value ? 'lg' : 'md',
    className: props.selected.value ? 'ring-2 ring-blue-500' : ''
  });
  
  // Create properties section if not collapsed
  if (!props.collapsed.value && getProperties().length > 0) {
    const propertiesDiv = document.createElement('div');
    propertiesDiv.className = 'space-y-2 mt-3 border-t border-gray-200 pt-3';
    
    getProperties().forEach((prop: any) => {
      const propContainer = document.createElement('div');
      propContainer.className = 'flex items-center gap-2';
      
      // Property key label
      const keyTypography = createTypography({
        variant: 'span',
        children: `${prop.key}:`,
        className: 'text-xs font-medium text-gray-600 w-16 flex-shrink-0'
      });
      propContainer.appendChild(keyTypography.element);
      cleanupFunctions.push(keyTypography.cleanup.destroy);
      
      // Property value input
      const valueInput = createInput({
        type: prop.type === 'number' ? 'number' : 'text',
        value: String(prop.value),
        onChange: (value) => {
          if (props.onPropertyChange) {
            const convertedValue = prop.type === 'number' ? Number(value) : value;
            props.onPropertyChange(prop.key, convertedValue);
          }
        },
        className: 'text-xs'
      });
      valueInput.element.style.cssText += 'flex: 1; min-width: 0;';
      propContainer.appendChild(valueInput.element);
      cleanupFunctions.push(valueInput.cleanup.destroy);
      
      propertiesDiv.appendChild(propContainer);
    });
    
    entityCard.content.appendChild(propertiesDiv);
  }
  
  entityContent.appendChild(entityCard.element);
  cleanupFunctions.push(entityCard.cleanup.destroy);
  
  // Embed entity content in SVG
  const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreignObject.setAttribute('x', currentPosition.x.toString());
  foreignObject.setAttribute('y', currentPosition.y.toString());
  foreignObject.setAttribute('width', currentDimensions.width.toString());
  foreignObject.setAttribute('height', currentDimensions.height.toString());
  foreignObject.appendChild(entityContent);
  
  container.appendChild(foreignObject);
  
  // Create edges after content
  createEntityEdges();
  
  // Handle drag functionality
  if (props.draggable && props.onDrag) {
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    
    const handleMouseDown = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      isDragging = true;
      dragStart = { x: mouseEvent.clientX, y: mouseEvent.clientY };
      if (props.onSelect) props.onSelect();
    };
    
    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      if (!isDragging || !props.onDrag) return;
      
      const delta = {
        x: mouseEvent.clientX - dragStart.x,
        y: mouseEvent.clientY - dragStart.y
      };
      
      props.onDrag(delta);
      dragStart = { x: mouseEvent.clientX, y: mouseEvent.clientY };
    };
    
    const handleMouseUp = () => {
      isDragging = false;
    };
    
    // Make header draggable
    const header = entityCard.header;
    if (header) {
      header.style.cursor = 'move';
      header.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      listeners.push(
        { target: header, type: 'mousedown', listener: handleMouseDown },
        { target: document, type: 'mousemove', listener: handleMouseMove },
        { target: document, type: 'mouseup', listener: handleMouseUp }
      );
    }
  }
  
  // Handle selection
  if (props.onSelect) {
    const handleClick = () => props.onSelect!();
    entityCard.element.addEventListener('click', handleClick);
    listeners.push({ target: entityCard.element, type: 'click', listener: handleClick });
  }
  
  // Signal subscriptions
  if (typeof props.title !== 'string') {
    const unsubscribeTitle = props.title.subscribe(() => {
      // Title will update automatically through card component
    });
    cleanupFunctions.push(unsubscribeTitle);
  }
  
  const unsubscribeCollapsed = props.collapsed.subscribe((collapsed) => {
    // Update chevron icon
    chevronIcon.element.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(90deg)';
    
    // Re-render properties section
    const existingProps = entityCard.content.querySelector('.space-y-2');
    if (existingProps) {
      entityCard.content.removeChild(existingProps);
    }
    
    if (!collapsed && getProperties().length > 0) {
      // Re-create properties section (same logic as above)
      const propertiesDiv = document.createElement('div');
      propertiesDiv.className = 'space-y-2 mt-3 border-t border-gray-200 pt-3';
      
      getProperties().forEach((prop: any) => {
        const propContainer = document.createElement('div');
        propContainer.className = 'flex items-center gap-2';
        
        const keyTypography = createTypography({
          variant: 'span',
          children: `${prop.key}:`,
          className: 'text-xs font-medium text-gray-600 w-16 flex-shrink-0'
        });
        propContainer.appendChild(keyTypography.element);
        cleanupFunctions.push(keyTypography.cleanup.destroy);
        
        const valueInput = createInput({
          type: prop.type === 'number' ? 'number' : 'text',
          value: String(prop.value),
          onChange: (value) => {
            if (props.onPropertyChange) {
              const convertedValue = prop.type === 'number' ? Number(value) : value;
              props.onPropertyChange(prop.key, convertedValue);
            }
          },
          className: 'text-xs'
        });
        valueInput.element.style.cssText += 'flex: 1; min-width: 0;';
        propContainer.appendChild(valueInput.element);
        cleanupFunctions.push(valueInput.cleanup.destroy);
        
        propertiesDiv.appendChild(propContainer);
      });
      
      entityCard.content.appendChild(propertiesDiv);
    }
  });
  cleanupFunctions.push(unsubscribeCollapsed);
  
  const unsubscribeSelected = props.selected.subscribe((selected) => {
    // Update card visual state
    entityCard.element.className = entityCard.element.className.replace(
      /ring-2 ring-blue-500|shadow-\w+/g, 
      ''
    );
    entityCard.element.className += selected 
      ? ' ring-2 ring-blue-500 shadow-lg' 
      : ' shadow-md';
  });
  cleanupFunctions.push(unsubscribeSelected);
  
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