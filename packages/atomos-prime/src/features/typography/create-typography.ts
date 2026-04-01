import type { TypographyProps, TypographyResult } from './types/typography.types.js';
export type { TypographyProps, TypographyResult };

export const createTypography = function(props: TypographyProps): TypographyResult {
  const element = document.createElement(props.variant);
  const cleanupFunctions: Array<() => void> = [];
  
  if (props.id) element.id = props.id;
  if (props.className) element.className = props.className;
  
  if (typeof props.children === 'string') {
    element.textContent = props.children;
  } else {
    element.textContent = props.children.value;
    const unsubscribe = props.children.subscribe((newText) => {
      element.textContent = newText;
    });
    cleanupFunctions.push(unsubscribe);
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