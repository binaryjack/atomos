import type { IconName, IconProps, IconResult } from './types/icon.types.js'
export type { IconName, IconProps, IconResult }

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
    'chevron-down': 'M19 9l-7 7-7-7',
    'chevron-up': 'M5 15l7-7 7 7',
    'arrow-left': 'M14 5l-7 7 7 7',
    'arrow-right': 'M10 19l7-7-7-7',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    delete: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    database: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    code: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
    upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    link: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
    image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    play: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    stop: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
    refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
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
  } else if (props.name) {
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