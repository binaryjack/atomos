import type { SkeletonProps, SkeletonResult } from './types/skeleton.types.js';
export type { SkeletonProps, SkeletonResult };

export const createSkeleton = function(props: SkeletonProps): SkeletonResult {
  const element = document.createElement('div');
  const cleanupFunctions: Array<() => void> = [];
  
  // Build CSS classes based on variant
  const baseClasses = 'bg-gray-300';
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md'
  };
  
  const variant = props.variant || 'rectangular';
  element.className = `${baseClasses} ${variantClasses[variant]} ${props.className || ''}`;
  
  // Handle dimensions
  if (props.width) {
    element.style.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  }
  if (props.height) {
    element.style.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  
  // Handle animation (boolean or signal)
  const setAnimation = (animate: boolean) => {
    if (animate) {
      element.style.animation = 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite';
    } else {
      element.style.animation = 'none';
    }
  };
  
  if (typeof props.animation === 'boolean') {
    setAnimation(props.animation);
  } else if (props.animation) {
    setAnimation(props.animation.value);
    const unsubscribe = props.animation.subscribe(setAnimation);
    cleanupFunctions.push(unsubscribe);
  } else {
    setAnimation(true); // Default to animated
  }
  
  return {
    element,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};