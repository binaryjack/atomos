import { createSpinner } from '../spinner/create-spinner.js'
import type { ButtonProps, ButtonResult } from './types/button.types.js'

export type { ButtonProps, ButtonResult }

export const createButton = function(props: ButtonProps): ButtonResult {
  const element = document.createElement('button');
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];
  const cleanupFunctions: Array<() => void> = [];

  if (props.id) element.id = props.id;
  element.type = props.type || 'button';

  // Build CSS classes
  const shape = props.shape || 'rounded';
  const isIconOnly = shape === 'icon-only';

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 border border-transparent',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 border border-transparent',
    outline: 'border-2 border-slate-600 text-slate-200 hover:bg-slate-800 focus:ring-slate-500',
    ghost: 'text-slate-300 hover:bg-slate-800 focus:ring-slate-500 bg-transparent',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
    soft: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 focus:ring-purple-500 border border-transparent'
  };

  const sizeClasses = {
    sm: isIconOnly ? 'p-1.5' : 'px-3 py-1.5 text-sm',
    md: isIconOnly ? 'p-2' : 'px-4 py-2 text-base',
    lg: isIconOnly ? 'p-3' : 'px-6 py-3 text-lg'
  };

  const shapeClasses = {
    'rounded': 'rounded-md',
    'pill': 'rounded-full',
    'icon-only': 'rounded-full aspect-square'
  };

  element.className = `${baseClasses} ${variantClasses[props.variant]} ${sizeClasses[props.size]} ${shapeClasses[shape]} ${props.className || ''}`;

  // Layout container for spacing
  const innerSpan = document.createElement('span');
  innerSpan.className = 'w-full flex items-center justify-center gap-2';
  element.appendChild(innerSpan);

  // Spinner container (hidden by default unless loading is strictly true)
  let spinnerContainer: HTMLElement | null = null;

  const getSpinnerContainer = () => {
    if (!spinnerContainer) {
      const { element: spinnerEl } = createSpinner({ size: 'xs' });
      spinnerContainer = document.createElement('span');
      spinnerContainer.style.display = 'none'; // hidden initially
      spinnerContainer.appendChild(spinnerEl);
    }
    return spinnerContainer;
  };

  // Add Left Icon
  if (props.leftIcon) {
    innerSpan.appendChild(props.leftIcon);
  }

  // Spinner insertion
  const sContainer = getSpinnerContainer();
  innerSpan.appendChild(sContainer);

  // Handle text
  const textSpan = document.createElement('span');
  if (!isIconOnly) {
    innerSpan.appendChild(textSpan);
  }

  if (props.children) {
    if (typeof props.children === 'string') {
      textSpan.textContent = props.children;
    } else {
      textSpan.textContent = props.children.value;
      const unsubscribe = props.children.subscribe((newText) => {
        textSpan.textContent = newText;
      });
      cleanupFunctions.push(unsubscribe);
    }
  }

  // Add Right Icon
  if (props.rightIcon) {
    innerSpan.appendChild(props.rightIcon);
  }

  // Handle Loading State
  const updateLoading = (isLoading: boolean) => {
    if (isLoading) {
      if (props.leftIcon) props.leftIcon.style.display = 'none';
      if (props.rightIcon) props.rightIcon.style.display = 'none';
      sContainer.style.display = 'inline-flex';
      element.setAttribute('data-loading', 'true');
    } else {
      if (props.leftIcon) props.leftIcon.style.display = '';
      if (props.rightIcon) props.rightIcon.style.display = '';
      sContainer.style.display = 'none';
      element.removeAttribute('data-loading');
    }
  };

  if (props.loading !== undefined) {
    if (typeof props.loading === 'boolean') {
      updateLoading(props.loading);
    } else {
      updateLoading(props.loading.value);
      const unsubscribe = props.loading.subscribe(updateLoading);
      cleanupFunctions.push(unsubscribe);
    }
  }

  // Handle disabled (boolean or signal, must combine with loading)
  const updateDisabled = () => {
    const isBaseDisabled = typeof props.disabled === 'boolean' 
      ? props.disabled 
      : (props.disabled?.value || false);
      
    const isLoadingDisabled = typeof props.loading === 'boolean'
      ? props.loading
      : (props.loading?.value || false);

    element.disabled = isBaseDisabled || isLoadingDisabled;
  };

  if (typeof props.disabled === 'boolean') {
    updateDisabled();
  } else if (props.disabled) {
    updateDisabled();
    const unsubscribe = props.disabled.subscribe(updateDisabled);
    cleanupFunctions.push(unsubscribe);
  }
  
  if (props.loading && typeof props.loading !== 'boolean') {
    const unsubscribeDisabledFromLoading = props.loading.subscribe(updateDisabled);
    cleanupFunctions.push(unsubscribeDisabledFromLoading);
  }

  // Click handler
  if (props.onClick) {
    element.addEventListener('click', props.onClick as EventListener);
    listeners.push({ target: element, type: 'click', listener: props.onClick as EventListener });
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
