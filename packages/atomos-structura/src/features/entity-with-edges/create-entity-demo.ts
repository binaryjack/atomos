import type { EntityWithEdgesProps } from './types/entity-with-edges.types.js';
import type { Property } from '@atomos-web/structura-core';
import { createSignal } from '@atomos-web/prime';

export const createEntityDemo = (): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'relative w-full h-64 bg-base-50 border border-base-200 rounded-lg overflow-hidden';
  container.style.minHeight = '400px';

  // Create SVG container
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 800 400');
  svg.setAttribute('class', 'w-full h-full');

  // Create sample property data
  const nameProperty: Property = { 
    key: 'name', 
    label: 'Name',
    value: 'John Doe', 
    dataType: 'string', 
    componentType: 'input',
  };
  const ageProperty: Property = { 
    key: 'age', 
    label: 'Age',
    value: 30, 
    dataType: 'number', 
    componentType: 'input',
  };
  const activeProperty: Property = { 
    key: 'active', 
    label: 'Active',
    value: true, 
    dataType: 'boolean', 
    componentType: 'checkbox',
  };

  // Create sample entity data
  const entityProps: EntityWithEdgesProps = {
    id: 'demo-entity-1',
    title: createSignal('Sample Entity'),
    properties: createSignal([nameProperty, ageProperty, activeProperty]),
    position: createSignal({ x: 200, y: 100 }),
    dimensions: createSignal({ width: 200, height: 150 }),
    collapsed: createSignal(false),
    selected: createSignal(false),
    draggable: true,
    resizable: true,
    edges: {
      top: {
        position: 'top',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'anchor-top',
          edgePosition: 'top',
          offset: 0.5
        }
      },
      bottom: {
        position: 'bottom',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'anchor-bottom',
          edgePosition: 'bottom',
          offset: 0.5
        }
      },
      left: {
        position: 'left',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'anchor-left',
          edgePosition: 'left',
          offset: 0.5
        }
      },
      right: {
        position: 'right',
        entityId: 'demo-entity-1',
        thickness: 3,
        anchor: {
          id: 'anchor-right',
          edgePosition: 'right',
          offset: 0.5
        }
      }
    },
    onSelect: () => {
      console.log('Entity selected');
    },
    onDrag: (delta) => {
      console.log('Entity dragged:', delta);
    },
    onResize: (dimensions) => {
      console.log('Entity resized:', dimensions);
    },
    onPropertyChange: (propertyId, value) => {
      console.log('Property changed:', propertyId, value);
    }
  };

  // Create placeholder for entity (will implement createEntityWithEdges next)
  const entityPlaceholder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
  // Create entity rectangle
  const entityRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  entityRect.setAttribute('x', '200');
  entityRect.setAttribute('y', '100');
  entityRect.setAttribute('width', '200');
  entityRect.setAttribute('height', '150');
  entityRect.setAttribute('fill', '#ffffff');
  entityRect.setAttribute('stroke', '#374151');
  entityRect.setAttribute('stroke-width', '2');
  entityRect.setAttribute('rx', '8');
  
  // Create title text
  const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  titleText.setAttribute('x', '300');
  titleText.setAttribute('y', '125');
  titleText.setAttribute('text-anchor', 'middle');
  titleText.setAttribute('class', 'fill-base-900 text-sm font-medium');
  titleText.textContent = 'Sample Entity';
  
  // Create anchor points
  const anchors = [
    { x: 300, y: 100, position: 'top' },
    { x: 300, y: 250, position: 'bottom' },
    { x: 200, y: 175, position: 'left' },
    { x: 400, y: 175, position: 'right' }
  ];
  
  anchors.forEach(anchor => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', anchor.x.toString());
    circle.setAttribute('cy', anchor.y.toString());
    circle.setAttribute('r', '6');
    circle.setAttribute('fill', '#3b82f6');
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '2');
    circle.setAttribute('class', 'cursor-pointer hover:fill-blue-600');
    entityPlaceholder.appendChild(circle);
  });
  
  entityPlaceholder.appendChild(entityRect);
  entityPlaceholder.appendChild(titleText);
  svg.appendChild(entityPlaceholder);
  container.appendChild(svg);

  // Add title and description
  const header = document.createElement('div');
  header.className = 'absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-xs font-medium text-base-700 border border-base-200';
  header.textContent = 'Interactive Entity with 4 Edges & Anchor Points';
  container.appendChild(header);

  return container;
};
