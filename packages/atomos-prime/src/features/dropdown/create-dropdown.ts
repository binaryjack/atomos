import type { DropdownProps, DropdownResult, DropdownOption } from './types/dropdown.types.js';
import { defineAtpDropdown, type AtpDropdown } from './atp-dropdown/atp-dropdown.js';

export type { DropdownProps, DropdownResult, DropdownOption };

export const createDropdown = function(props: DropdownProps): DropdownResult {
  defineAtpDropdown();
  const select = document.createElement('atp-dropdown') as AtpDropdown;
  const container = document.createElement('div');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];
  
  if (props.id) select.id = props.id;
  if (props.name) select.name = props.name;
  
  container.className = `relative ${props.className || ''}`;

  // Handle options (array or signal)
  if (Array.isArray(props.options)) {
    select.options = props.options;
  } else {
    select.options = props.options.value;
    const unsubscribe = props.options.subscribe((newOptions) => {
      select.options = newOptions;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Handle placeholder string or signal
  if (typeof props.placeholder === 'string') {
    select.placeholder = props.placeholder;
  } else if (props.placeholder) {
    select.placeholder = props.placeholder.value;
    const unsubscribe = props.placeholder.subscribe((newPlaceholder) => {
      select.placeholder = newPlaceholder;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Handle value (string or signal)
  if (typeof props.value === 'string') {
    select.value = props.value;
  } else if (props.value) {
    select.value = props.value.value;
    const unsubscribe = props.value.subscribe((newValue) => {
      if (select.value !== newValue) {
        select.value = newValue;
      }
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Handle disabled (boolean or signal)
  if (typeof props.disabled === 'boolean') {
    select.disabled = props.disabled;
  } else if (props.disabled) {
    select.disabled = props.disabled.value;
    const unsubscribe = props.disabled.subscribe((newDisabled) => {
      select.disabled = newDisabled;
    });
    cleanupFunctions.push(unsubscribe);
  }
  
  // Change handler
  if (props.onChange) {
    const changeHandler = (e: Event) => {
      props.onChange!((e.target as AtpDropdown).value);
    };
    select.addEventListener('change', changeHandler);
    listeners.push({ target: select, type: 'change', listener: changeHandler as EventListener });
  }
  
  container.appendChild(select);
  
  return {
    element: container,
    select: select as unknown as HTMLSelectElement,
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
