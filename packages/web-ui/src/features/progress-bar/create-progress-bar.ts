import type { Signal } from '../../core/types/signal.types.js';
import type { ProgressBarProps, ProgressBarResult } from './types/progress-bar.types.js';

export const createProgressBar = function(props: ProgressBarProps): ProgressBarResult {
  const cleanupFunctions: Array<() => void> = [];
  
  const orientation = props.orientation || 'horizontal';
  const variant = props.variant || 'primary';
  const size = props.size || 'md';
  const reversible = props.reversible || false;
  
  // Size Map
  const sizeMap = {
    horizontal: { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' },
    vertical: { sm: 'w-1.5', md: 'w-2.5', lg: 'w-4' }
  };
  
  // Variant Map
  const variantColor = {
    primary: 'bg-purple-600',
    success: 'bg-green-500',
    warn: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const isVertical = orientation === 'vertical';

  const containerDir = isVertical
    ? (reversible ? 'flex-col' : 'flex-col-reverse')
    : (reversible ? 'flex-row-reverse' : 'flex-row');

  const containerClasses = `flex ${containerDir} overflow-hidden bg-slate-800 rounded-full ${
    sizeMap[orientation][size]
  } ${isVertical ? 'h-full inline-flex' : 'w-full'} ${props.className || ''}`;

  const container = document.createElement('div');
  container.className = containerClasses;

  const barClasses = `flex flex-col justify-center overflow-hidden text-xs text-white text-center whitespace-nowrap transition-all duration-300 ease-in-out ${variantColor[variant]}`;
  const bar = document.createElement('div');
  bar.className = barClasses;

  // Render Label if needed
  const label = props.showLabel ? document.createElement('span') : null;
  if (label && size === 'lg') { // Text only really fits in large
    label.className = 'px-2 font-medium';
    bar.appendChild(label);
  }

  container.appendChild(bar);

  // Update function
  const updateValue = (val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    if (isVertical) {
      bar.style.height = `${clamped}%`;
      bar.style.width = '100%';
    } else {
      bar.style.width = `${clamped}%`;
      bar.style.height = '100%';
    }
    
    if (label) {
      label.textContent = `${Math.round(clamped)}%`;
    }
  };

  // Signal or static handling
  if (typeof props.value === 'number') {
    updateValue(props.value);
  } else {
    updateValue(props.value.value);
    const unsubscribe = (props.value as Signal<number>).subscribe((val) => updateValue(val));
    cleanupFunctions.push(unsubscribe);
  }

  return {
    element: container,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};
