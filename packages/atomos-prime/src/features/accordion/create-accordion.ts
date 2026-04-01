import type { AccordionProps, AccordionResult } from './types/accordion.types.js';
export type { AccordionProps, AccordionResult };

export const createAccordion = function(props: AccordionProps): AccordionResult {
  const element = document.createElement('div');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  let isOpen = props.defaultOpen || false;
  
  element.className = `border border-gray-200 rounded-lg overflow-hidden ${props.className || ''}`;
  
  // Header (clickable trigger)
  const header = document.createElement('button');
  header.className = 'w-full px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset flex justify-between items-center';
  
  const titleSpan = document.createElement('span');
  titleSpan.className = 'font-medium text-gray-900';
  
  // Handle title (string or signal)
  if (typeof props.title === 'string') {
    titleSpan.textContent = props.title;
  } else {
    titleSpan.textContent = props.title.value;
    const unsubscribe = props.title.subscribe((newTitle) => {
      titleSpan.textContent = newTitle;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Chevron icon
  const chevron = document.createElement('span');
  chevron.className = 'transform transition-transform duration-200';
  chevron.innerHTML = '▼';
  
  header.appendChild(titleSpan);
  header.appendChild(chevron);
  
  // Content panel
  const content = document.createElement('div');
  content.className = 'overflow-hidden transition-all duration-300 ease-in-out';
  
  const contentInner = document.createElement('div');
  contentInner.className = 'px-4 py-3 bg-white';
  content.appendChild(contentInner);
  
  // Handle children (array or signal)
  if (props.children) {
    const renderChildren = (children: HTMLElement[]) => {
      contentInner.innerHTML = '';
      children.forEach(child => contentInner.appendChild(child));
    };
    
    if (Array.isArray(props.children)) {
      renderChildren(props.children);
    } else {
      renderChildren(props.children.value);
      const unsubscribe = props.children.subscribe(renderChildren);
      cleanupFunctions.push(unsubscribe);
    }
  }
  
  // Update visual state
  const updateState = () => {
    if (isOpen) {
      content.style.maxHeight = content.scrollHeight + 'px';
      chevron.style.transform = 'rotate(180deg)';
    } else {
      content.style.maxHeight = '0px';
      chevron.style.transform = 'rotate(0deg)';
    }
  };
  
  // Toggle function
  const toggle = () => {
    if (typeof props.disabled === 'boolean' && props.disabled) return;
    if (typeof props.disabled !== 'boolean' && props.disabled && props.disabled.value) return;
    
    isOpen = !isOpen;
    updateState();
    if (props.onToggle) props.onToggle(isOpen);
  };
  
  // Handle disabled (boolean or signal)
  const updateDisabled = (disabled: boolean) => {
    header.disabled = disabled;
    if (disabled) {
      header.classList.add('opacity-50', 'cursor-not-allowed');
      header.classList.remove('hover:bg-gray-100');
    } else {
      header.classList.remove('opacity-50', 'cursor-not-allowed');
      header.classList.add('hover:bg-gray-100');
    }
  };
  
  if (typeof props.disabled === 'boolean') {
    updateDisabled(props.disabled);
  } else if (props.disabled) {
    updateDisabled(props.disabled.value);
    const unsubscribe = props.disabled.subscribe(updateDisabled);
    cleanupFunctions.push(unsubscribe);
  }
  
  // Click handler
  header.addEventListener('click', toggle);
  listeners.push({ target: header, type: 'click', listener: toggle });
  
  // Initial state
  updateState();
  
  element.appendChild(header);
  element.appendChild(content);
  
  return {
    element,
    toggle,
    isOpen: () => isOpen,
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