import type { EntityFrameProps, EntityFrameResult } from './types/entity-frame.types.js';
export type { EntityFrameProps, EntityFrameResult };
import { defineAtomosEntityFrame } from './atomos-entity-frame.js';

defineAtomosEntityFrame();

export const createEntityFrame = function(props: EntityFrameProps): EntityFrameResult {
  const element = document.createElement('atomos-entity-frame');
  const cleanupFunctions: Array<() => void> = [];

  if (props.id) element.id = props.id;
  if (props.className) element.className = props.className;

  const defaultWidth = props.width ?? 200;
  element.setAttribute('width', String(defaultWidth));

  const getCurrentPosition = () => {
    if (!props.position) return { x: 0, y: 0 };
    return typeof props.position === 'object' && 'x' in props.position 
      ? props.position 
      : props.position.value;
  };

  const currentPosition = getCurrentPosition();
  element.setAttribute('x', String(currentPosition.x));
  element.setAttribute('y', String(currentPosition.y));

  const getCurrentTitle = () => typeof props.title === 'string' ? props.title : props.title.value;
  element.setAttribute('title', getCurrentTitle());

  if (props.subtitle) {
    element.setAttribute('subtitle', props.subtitle);
  }

  const isCollapsed = props.collapsed ? props.collapsed.value : false;
  if (isCollapsed) {
    element.setAttribute('collapsed', '');
  }

  // Properties mapping
  const renderProperties = () => {
    element.innerHTML = '';
    const propertiesData = props.properties;
    if (!propertiesData) return;
    
    const propsList = Array.isArray(propertiesData) ? propertiesData : propertiesData.value;
    propsList.forEach((prop) => {
      const keySpan = document.createElement('span');
      keySpan.className = 'property-key';
      keySpan.textContent = prop.key;
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'property-value';
      valueSpan.textContent = prop.value;
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'property-type';
      typeSpan.textContent = prop.type;
      
      element.appendChild(keySpan);
      element.appendChild(valueSpan);
      element.appendChild(typeSpan);
    });
  };

  renderProperties();

  if (typeof props.title !== 'string') {
    const unsub = props.title.subscribe((v) => element.setAttribute('title', v));
    cleanupFunctions.push(unsub);
  }

  if (props.collapsed) {
    const unsub = props.collapsed.subscribe((v) => {
      if (v) element.setAttribute('collapsed', '');
      else element.removeAttribute('collapsed');
    });
    cleanupFunctions.push(unsub);
  }

  if (props.properties && !Array.isArray(props.properties)) {
    const unsub = props.properties.subscribe(() => renderProperties());
    cleanupFunctions.push(unsub);
  }

  if (props.position && !('x' in props.position)) {
    const unsub = props.position.subscribe((pos: {x: number, y: number}) => {
      element.setAttribute('x', String(pos.x));
      element.setAttribute('y', String(pos.y));
    });
    cleanupFunctions.push(unsub);
  }

  const onTitleClick = () => {
    if (props.onTitleClick) props.onTitleClick();
  };

  const onToggleCollapse = (e: Event) => {
    const evt = e as CustomEvent;
    if (props.onToggleCollapse) props.onToggleCollapse(evt.detail.collapsed);
    if (props.collapsed) props.collapsed.set(evt.detail.collapsed);
  };

  element.addEventListener('title-click', onTitleClick);
  element.addEventListener('toggle-collapse', onToggleCollapse);

  cleanupFunctions.push(() => {
    element.removeEventListener('title-click', onTitleClick);
    element.removeEventListener('toggle-collapse', onToggleCollapse);
  });

  return {
    element,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
        element.remove();
      }
    }
  };
};
