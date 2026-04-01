import type { Signal } from '../../core/types/signal.types.js'
import type { CircularProgressProps, CircularProgressResult } from './types/circular-progress.types.js'

export const createCircularProgress = function(props: CircularProgressProps): CircularProgressResult {
  const cleanupFunctions: Array<() => void> = [];
  
  const size = props.size || 64;
  const strokeWidth = props.strokeWidth || Math.max(4, size * 0.1); // default proportional
  const variant = props.variant || 'primary';
  
  const variantColor = {
    primary: 'text-purple-600',
    success: 'text-green-500',
    warn: 'text-yellow-500',
    danger: 'text-red-500',
    info: 'text-blue-500'
  };

  const trackColor = 'text-slate-800'; // matching theme
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const container = document.createElement('div');
  container.className = `relative inline-flex items-center justify-center ${props.className || ''}`;
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'transform -rotate-90 w-full h-full');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  // Track circle
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('class', trackColor);
  track.setAttribute('stroke', 'currentColor');
  track.setAttribute('fill', 'transparent');
  track.setAttribute('stroke-width', strokeWidth.toString());
  track.setAttribute('r', radius.toString());
  track.setAttribute('cx', (size / 2).toString());
  track.setAttribute('cy', (size / 2).toString());

  // Progress circle
  const progress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progress.setAttribute('class', `${variantColor[variant]} transition-all duration-300 ease-in-out`);
  progress.setAttribute('stroke', 'currentColor');
  progress.setAttribute('fill', 'transparent');
  progress.setAttribute('stroke-width', strokeWidth.toString());
  progress.setAttribute('stroke-linecap', 'round');
  progress.setAttribute('stroke-dasharray', circumference.toString());
  progress.setAttribute('r', radius.toString());
  progress.setAttribute('cx', (size / 2).toString());
  progress.setAttribute('cy', (size / 2).toString());

  svg.appendChild(track);
  svg.appendChild(progress);
  container.appendChild(svg);

  let label: HTMLElement | null = null;
  if (props.showLabel) {
    label = document.createElement('span');
    label.className = 'absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-200';
    container.appendChild(label);
  }

  // Update function
  const updateValue = (val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    const strokeDashoffset = circumference - (clamped / 100) * circumference;
    progress.setAttribute('stroke-dashoffset', strokeDashoffset.toString());
    
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
