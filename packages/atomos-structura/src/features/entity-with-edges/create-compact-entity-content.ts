import type { Entity, EntityShape } from '@atomos-web/structura-core';
import { createSVGShape } from '../../canvas/shape-renderers/create-svg-shape.js';
import { computeContrastColor } from '@atomos-web/prime';
import type { Signal } from '@atomos-web/prime';

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
  onDelete?: () => void;
}): CompactEntityContentResult => {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const contrast = computeContrastColor(props.color ?? 'var(--vbs-bg-panel, #111111)');
  
  // Create wrapper that will receive the rendered shape
  const shapeWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.appendChild(shapeWrapper);

  // Cache padding values once — reading getComputedStyle inside updateSize causes layout thrashing
  const rootStyle = getComputedStyle(document.documentElement);
  const namePy = parseInt(rootStyle.getPropertyValue('--vbs-entity-name-padding-y') || '-8', 10) || -8;
  const propsPy = parseInt(rootStyle.getPropertyValue('--vbs-entity-props-padding-y') || '12', 10) || 12;

  const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textNode.setAttribute('text-anchor', 'middle');
  textNode.setAttribute('dominant-baseline', 'middle');
  textNode.setAttribute('class', 'vbs-entity-name');
  textNode.style.pointerEvents = 'none';
  textNode.style.userSelect = 'none';
  // Inline fill wins over CSS class — adaptive contrast to entity background color
  textNode.style.fill = contrast.textColor;

  const propsNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  propsNode.setAttribute('text-anchor', 'middle');
  propsNode.setAttribute('dominant-baseline', 'middle');
  propsNode.setAttribute('class', 'vbs-entity-props');
  propsNode.style.pointerEvents = 'none';
  propsNode.style.userSelect = 'none';
  // Inline fill wins over CSS class — adaptive muted contrast color
  propsNode.style.fill = contrast.mutedColor;
  
  const updateLabel = () => {
    textNode.textContent = props.entitySignal.value.name || props.shape;
    const propCount = (props.entitySignal.value.properties || []).length;
    propsNode.textContent = propCount === 1 ? '1 prop' : `${propCount} props`;
  };
  updateLabel();
  const unsubLabel = props.entitySignal.subscribe(updateLabel);
  
  g.appendChild(textNode);
  g.appendChild(propsNode);

  // Delete Button (X)
  const deleteBtnGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  deleteBtnGroup.style.cursor = 'pointer';
  deleteBtnGroup.innerHTML = `
    <circle cx="0" cy="0" r="10" fill="#ef4444" stroke="#fff" stroke-width="1.5" />
    <path d="M-3,-3 L3,3 M3,-3 L-3,3" stroke="#fff" stroke-width="2" stroke-linecap="round" />
  `;
  // Add hover effect
  deleteBtnGroup.onmouseenter = () => { deleteBtnGroup.style.opacity = '0.8'; };
  deleteBtnGroup.onmouseleave = () => { deleteBtnGroup.style.opacity = '1'; };
  deleteBtnGroup.onclick = (e) => {
    e.stopPropagation();
    if (props.onDelete) props.onDelete();
  };
  g.appendChild(deleteBtnGroup);
  
  // Interaction
  const handleDblClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onDoubleClick();
  };
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
    textNode.setAttribute('y', (height / 2 + namePy).toString());

    propsNode.setAttribute('x', (width / 2).toString());
    propsNode.setAttribute('y', (height / 2 + propsPy).toString());

    deleteBtnGroup.setAttribute('transform', `translate(${width - 10}, 10)`);
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
