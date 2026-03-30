import type { Entity, EntityShape } from '@vbs/vbs-mod';
import { createSVGShape } from '../../canvas/shape-renderers/create-svg-shape.js';
import type { Signal } from '../../core/types/signal.types.js';

export interface CompactEntityContentResult {
  readonly rootElement: SVGElement;
  readonly dragHandle: SVGElement;
  updateSize(width: number, height: number): void;
  cleanup: { destroy(): void };
}

export const createCompactEntityContent = (props: {
  shape: EntityShape;
  color?: string | undefined;
  entitySignal: Signal<Entity>;
  onDoubleClick: () => void;
}): CompactEntityContentResult => {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
  // Create wrapper that will receive the rendered shape
  const shapeWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.appendChild(shapeWrapper);

  const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textNode.setAttribute('text-anchor', 'middle');
  textNode.setAttribute('dominant-baseline', 'middle');
  textNode.style.pointerEvents = 'none';
  textNode.style.userSelect = 'none';
  textNode.style.fontFamily = 'sans-serif';
  textNode.style.fontWeight = 'bold';
  textNode.style.fontSize = '14px';
  textNode.style.fill = '#1f2937';
  
  const updateLabel = () => {
    textNode.textContent = props.entitySignal.value.name || props.shape;
  };
  updateLabel();
  const unsubLabel = props.entitySignal.subscribe(updateLabel);
  
  g.appendChild(textNode);
  
  // Interaction
  const handleDblClick = () => props.onDoubleClick();
  g.addEventListener('dblclick', handleDblClick);
  g.style.cursor = 'grab';

  let currentShape: SVGElement | null = null;
  
  const updateSize = (width: number, height: number): void => {
    if (currentShape?.parentNode) {
      currentShape.parentNode.removeChild(currentShape);
    }
    currentShape = createSVGShape(props.shape, width, height, props.color);
    shapeWrapper.appendChild(currentShape);
    
    textNode.setAttribute('x', (width / 2).toString());
    textNode.setAttribute('y', (height / 2).toString());
  };

  return {
    rootElement: g,
    dragHandle: g, // The whole group is the drag handle
    updateSize,
    cleanup: {
      destroy: () => {
        g.removeEventListener('dblclick', handleDblClick);
        unsubLabel();
      }
    }
  };
};