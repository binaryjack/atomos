import type { IconProps, IconResult, IconName } from './types/icon.types.js';
export type { IconProps, IconResult, IconName };

export const createIcon = function(props: IconProps): IconResult {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  // SVG attributes
  svg.setAttribute('fill', 'none');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  
  // Size handling
  const size = props.size || 24;
  const sizeValue = typeof size === 'number' ? `${size}px` : size;
  svg.style.width = sizeValue;
  svg.style.height = sizeValue;
  
  // CSS classes
  const baseClasses = 'inline-block';
  svg.setAttribute('class', `${baseClasses} ${props.className || ''}`);
  
  // Color handling
  const updateColor = (color: string) => {
    svg.style.color = color;
  };
  
  if (typeof props.color === 'string') {
    updateColor(props.color);
  } else if (props.color) {
    updateColor(props.color.value);
    const unsubscribe = props.color.subscribe(updateColor);
    cleanupFunctions.push(unsubscribe);
  }
  
  // Icon paths
  const iconPaths: Record<IconName, string> = {
    check: 'M5 13l4 4L19 7',
    close: 'M18 6L6 18M6 6l12 12',
    'arrow-up': 'M19 14l-7-7m0 0l-7 7m7-7v18',
    'arrow-down': 'M5 10l7 7m0 0l7-7m-7 7V3',
    'arrow-left': 'M14 5l-7 7 7 7',
    'arrow-right': 'M10 19l7-7-7-7',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z'
  };
  
  // Update icon path
  const updateIcon = (iconName: IconName) => {
    svg.innerHTML = '';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('d', iconPaths[iconName]);
    svg.appendChild(path);
  };
  
  // Handle icon name (string or signal)
  if (typeof props.name === 'string') {
    updateIcon(props.name);
  } else {
    updateIcon(props.name.value);
    const unsubscribe = props.name.subscribe(updateIcon);
    cleanupFunctions.push(unsubscribe);
  }
  
  // Click handler
  if (props.onClick) {
    svg.style.cursor = 'pointer';
    svg.addEventListener('click', props.onClick);
    listeners.push({ target: svg, type: 'click', listener: props.onClick });
  }
  
  return {
    element: svg,
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