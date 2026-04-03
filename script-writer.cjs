const fs = require('fs');

const accordionContent = `import type { AccordionProps, AccordionResult } from './types/accordion.types.js';
export type { AccordionProps, AccordionResult };

export const createAccordion = function(props: AccordionProps): AccordionResult {
  const element = document.createElement('div');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];

  let isOpen = props.defaultOpen || false;

  element.className = \`border border-slate-700 bg-slate-800 rounded min-w-0 flex flex-col shrink-0 \${props.className || ''}\`.trim();

  // Header (clickable trigger)
  const header = document.createElement('div');
  header.className = 'w-full px-3 py-2 text-left hover:bg-slate-700/50 bg-slate-800 focus:outline-none flex items-center transition-colors cursor-pointer select-none';

  // Chevron icon (on the left to match Toolbox)
  const chevron = document.createElement('span');
  chevron.className = 'transform transition-transform duration-200 text-slate-400 w-4 text-xs text-center flex-shrink-0';
  chevron.innerHTML = '▼';

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'flex-1 font-medium text-slate-200 flex items-center ml-2 gap-2 overflow-hidden';

  // Handle title (HTMLElement, string or signal)
  if (props.title instanceof HTMLElement) {
    titleWrapper.appendChild(props.title);
  } else if (typeof props.title === 'string') {
    titleWrapper.textContent = props.title;
  } else {
    titleWrapper.textContent = props.title.value;
    const unsubscribe = props.title.subscribe((newTitle) => {
      titleWrapper.textContent = newTitle;
    });
    cleanupFunctions.push(unsubscribe);
  }

  header.appendChild(chevron);
  header.appendChild(titleWrapper);

  // Content panel
  const content = document.createElement('div');
  content.className = 'overflow-hidden transition-all duration-300 ease-in-out bg-slate-900 border-t border-slate-700 flex-1 min-h-0';

  const contentInner = document.createElement('div');
  contentInner.className = 'p-3 flex flex-col gap-2 min-h-0';

  content.appendChild(contentInner);

  // Handle children
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
      content.style.maxHeight = '5000px';
      contentInner.style.display = 'flex';
      chevron.style.transform = 'rotate(0deg)';
    } else {
      content.style.maxHeight = '0px';
      chevron.style.transform = 'rotate(-90deg)';
    }
  };

  // Toggle function
  const toggle = (e?: Event) => {
    if (e && (e.target as HTMLElement).closest('button')) return; // Ignore clicks inside buttons
    if (e && (e.target as HTMLElement).closest('input')) return; // Ignore clicks inside inputs
    if (typeof props.disabled === 'boolean' && props.disabled) return;
    if (typeof props.disabled !== 'boolean' && props.disabled && props.disabled.value) return;

    isOpen = !isOpen;
    updateState();
    if (props.onToggle) props.onToggle(isOpen);
  };

  const updateDisabled = (disabled: boolean) => {
    if (disabled) {
      header.classList.add('opacity-50', 'cursor-not-allowed');
      header.classList.remove('hover:bg-slate-700/50');  
    } else {
      header.classList.remove('opacity-50', 'cursor-not-allowed');
      header.classList.add('hover:bg-slate-700/50');     
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
    toggle: () => toggle(),
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
};`;

fs.writeFileSync('packages/atomos-prime/src/features/accordion/create-accordion.ts', accordionContent);
console.log('Accordion fixed!');
