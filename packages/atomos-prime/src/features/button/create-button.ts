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

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--vbs-primary,#3b82f6)] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-[var(--vbs-primary,#3b82f6)] text-white hover:bg-[var(--vbs-primary-hover,#2563eb)] border border-transparent shadow-[0_0_8px_rgba(59,130,246,0.3)]',
    secondary: 'bg-[var(--vbs-bg-panel,#111111)] border border-[var(--vbs-border,#27272a)] text-[var(--vbs-text-primary,#f4f4f5)] hover:border-[var(--vbs-border-hover,#3f3f46)] hover:bg-[#263348]',
    outline: 'border border-[var(--vbs-border,#27272a)] text-[var(--vbs-text-primary,#f4f4f5)] hover:border-[var(--vbs-border-hover,#3f3f46)] hover:bg-[#263348]',
    ghost: 'bg-transparent text-[var(--vbs-text-secondary,#a1a1aa)] hover:bg-white/5 border border-transparent hover:text-[var(--vbs-text-primary,#f4f4f5)]',
    danger: 'bg-[var(--vbs-danger,#ef4444)] text-white hover:bg-red-600 border border-transparent',
    soft: 'bg-[var(--vbs-primary,#3b82f6)]/20 text-[var(--vbs-primary,#3b82f6)] hover:bg-[var(--vbs-primary,#3b82f6)]/30 border border-transparent'
  };

  const sizeClasses = {
    sm: isIconOnly ? 'p-1' : 'px-2 min-h-[24px] text-[11px]',
    md: isIconOnly ? 'p-1.5' : 'px-3 min-h-[var(--vbs-control-height,28px)] text-[13px]',
    lg: isIconOnly ? 'p-2' : 'px-4 min-h-[36px] text-sm'
  };

  const shapeClasses = {
    'rounded': 'rounded-[var(--vbs-radius,2px)]',
    'pill': 'rounded-full',
    'icon-only': 'rounded-[var(--vbs-radius,2px)] aspect-square'
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
