import type { InputProps, InputResult } from './types/input.types.js';
export type { InputProps, InputResult };

export const createInput = function(props: InputProps): InputResult {
  const element = document.createElement('input');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  element.type = props.type;
  if (props.id) element.id = props.id;
  if (props.className) element.className = props.className;
  if (props.placeholder) element.placeholder = props.placeholder;
  if (props.readonly) element.readOnly = props.readonly;
  
  // Handle value (string or signal)
  if (typeof props.value === 'string') {
    element.value = props.value;
  } else if (props.value) {
    element.value = props.value.value;
    const unsubscribe = props.value.subscribe((newValue) => {
      element.value = newValue;
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
  
  // Event handlers
  if (props.onChange) {
    const handler = (e: Event) => {
      props.onChange!((e.target as HTMLInputElement).value);
    };
    element.addEventListener('input', handler);
    listeners.push({ target: element, type: 'input', listener: handler });
  }
  
  if (props.onFocus) {
    element.addEventListener('focus', props.onFocus);
    listeners.push({ target: element, type: 'focus', listener: props.onFocus });
  }
  
  if (props.onBlur) {
    element.addEventListener('blur', props.onBlur);
    listeners.push({ target: element, type: 'blur', listener: props.onBlur });
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