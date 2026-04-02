import type { CardProps, CardResult } from './types/card.types.js';
export type { CardProps, CardResult };

export const createCard = function(props: CardProps): CardResult {
  const element = document.createElement('div');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  // Build CSS classes
  const baseClasses = 'bg-[var(--vbs-bg-panel,#111111)] text-[var(--vbs-text-primary,#f4f4f5)] rounded-[var(--vbs-radius,2px)] border border-[var(--vbs-border,#27272a)] spotlight-border';
  const shadowClasses = {
    sm: 'shadow-[0_4px_12px_rgba(0,0,0,0.5),_0_0_0_1px_rgba(255,255,255,0.04)]',
    md: 'shadow-[0_8px_24px_rgba(0,0,0,0.6),_0_0_0_1px_rgba(255,255,255,0.04)]',
    lg: 'shadow-[0_16px_40px_rgba(0,0,0,0.65),_0_0_0_1px_rgba(255,255,255,0.04)]',
    xl: 'shadow-[0_25px_60px_rgba(0,0,0,0.65),_0_0_0_1px_rgba(255,255,255,0.04)]',
    '2xl': 'shadow-[0_40px_80px_rgba(0,0,0,0.7),_0_0_0_1px_rgba(255,255,255,0.04)]'
  };
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  const shadow = props.shadow || 'md';
  const padding = props.padding || 'md';
  element.className = `${baseClasses} ${shadowClasses[shadow]} ${paddingClasses[padding]} ${props.className || ''}`;

  element.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    element.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    element.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  });
  // Header section (if title or subtitle provided)
  let header: HTMLDivElement | undefined;
  if (props.title || props.subtitle) {
    header = document.createElement('div');
    header.className = 'mb-4';
    
    if (props.title) {
      const titleElement = document.createElement('h3');
      titleElement.className = 'text-lg font-semibold text-gray-900';
      
      if (typeof props.title === 'string') {
        titleElement.textContent = props.title;
      } else {
        titleElement.textContent = props.title.value;
        const unsubscribe = props.title.subscribe((newTitle) => {
          titleElement.textContent = newTitle;
        });
        cleanupFunctions.push(unsubscribe);
      }
      
      header.appendChild(titleElement);
    }
    
    if (props.subtitle) {
      const subtitleElement = document.createElement('p');
      subtitleElement.className = 'text-sm text-gray-600 mt-1';
      
      if (typeof props.subtitle === 'string') {
        subtitleElement.textContent = props.subtitle;
      } else {
        subtitleElement.textContent = props.subtitle.value;
        const unsubscribe = props.subtitle.subscribe((newSubtitle) => {
          subtitleElement.textContent = newSubtitle;
        });
        cleanupFunctions.push(unsubscribe);
      }
      
      header.appendChild(subtitleElement);
    }
    
    element.appendChild(header);
  }
  
  // Content section
  const content = document.createElement('div');
  content.className = 'card-content';
  
  // Handle children (array or signal)
  if (props.children) {
    const renderChildren = (children: HTMLElement[]) => {
      content.innerHTML = '';
      children.forEach(child => content.appendChild(child));
    };
    
    if (Array.isArray(props.children)) {
      renderChildren(props.children);
    } else {
      renderChildren(props.children.value);
      const unsubscribe = props.children.subscribe(renderChildren);
      cleanupFunctions.push(unsubscribe);
    }
  }
  
  element.appendChild(content);
  
  // Click handler
  if (props.onClick) {
    element.style.cursor = 'pointer';
    element.addEventListener('click', props.onClick);
    listeners.push({ target: element, type: 'click', listener: props.onClick });
  }
  
  return {
    element,
    ...(header && { header }),
    content,
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
  } as CardResult;
};