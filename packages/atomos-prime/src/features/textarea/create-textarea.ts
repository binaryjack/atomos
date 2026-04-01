import type { TextareaProps, TextareaResult } from './types/textarea.types.js';
export type { TextareaProps, TextareaResult };

export const createTextarea = function(props: TextareaProps): TextareaResult {
  const element = document.createElement('textarea');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  if (props.id) element.id = props.id;
  if (props.name) element.name = props.name;
  if (props.rows) element.rows = props.rows;
  if (props.cols) element.cols = props.cols;
  
  // Build CSS classes
  const baseClasses = 'w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical';
  element.className = `${baseClasses} ${props.className || ''}`;
  
  // Handle value (string or signal)
  if (typeof props.value === 'string') {
    element.value = props.value;
  } else if (props.value) {
    element.value = props.value.value;
    const unsubscribe = props.value.subscribe((newValue) => {
      if (element.value !== newValue) {
        element.value = newValue;
      }
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Handle placeholder (string or signal)
  if (typeof props.placeholder === 'string') {
    element.placeholder = props.placeholder;
  } else if (props.placeholder) {
    element.placeholder = props.placeholder.value;
    const unsubscribe = props.placeholder.subscribe((newPlaceholder) => {
      element.placeholder = newPlaceholder;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Handle disabled (boolean or signal)
  if (typeof props.disabled === 'boolean') {
    element.disabled = props.disabled;
  } else if (props.disabled) {
    element.disabled = props.disabled.value;
    const unsubscribe = props.disabled.subscribe((newDisabled) => {
      element.disabled = newDisabled;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Change handler
  if (props.onChange) {
    const changeHandler = () => props.onChange!(element.value);
    element.addEventListener('change', changeHandler);
    listeners.push({ target: element, type: 'change', listener: changeHandler });
  }
  
  // Input handler
  if (props.onInput) {
    const inputHandler = () => props.onInput!(element.value);
    element.addEventListener('input', inputHandler);
    listeners.push({ target: element, type: 'input', listener: inputHandler });
  }
  
  return {
    element,
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