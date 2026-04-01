import type { CheckboxProps, CheckboxResult } from './types/checkbox.types.js';
export type { CheckboxProps, CheckboxResult };

export const createCheckbox = function(props: CheckboxProps): CheckboxResult {
  const container = document.createElement('div');
  const input = document.createElement('input');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  input.type = 'checkbox';
  if (props.id) input.id = props.id;
  if (props.name) input.name = props.name;
  
  // Build CSS classes
  const baseClasses = 'w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2';
  input.className = baseClasses;
  
  container.className = `flex items-center ${props.className || ''}`;
  
  // Handle checked (boolean or signal)
  if (typeof props.checked === 'boolean') {
    input.checked = props.checked;
  } else if (props.checked) {
    input.checked = props.checked.value;
    const unsubscribe = props.checked.subscribe((newChecked) => {
      input.checked = newChecked;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Handle disabled (boolean or signal)
  if (typeof props.disabled === 'boolean') {
    input.disabled = props.disabled;
  } else if (props.disabled) {
    input.disabled = props.disabled.value;
    const unsubscribe = props.disabled.subscribe((newDisabled) => {
      input.disabled = newDisabled;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Change handler
  if (props.onChange) {
    const changeHandler = () => props.onChange!(input.checked);
    input.addEventListener('change', changeHandler);
    listeners.push({ target: input, type: 'change', listener: changeHandler });
  }
  
  container.appendChild(input);
  
  return {
    element: container,
    input,
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