import type { BadgeProps, BadgeResult } from './types/badge.types.js';
export type { BadgeProps, BadgeResult };

const VARIANT_CLASSES: Record<string, string> = {
  success: 'bg-green-900/40 text-green-300 border-green-700',
  warning: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  error:   'bg-red-900/40 text-red-300 border-red-700',
  info:    'bg-blue-900/40 text-blue-300 border-blue-700',
  neutral: 'bg-gray-800 text-gray-200 border-gray-700',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const createBadge = function(props: BadgeProps): BadgeResult {
  const element = document.createElement('span');
  const cleanupFunctions: Array<() => void> = [];

  if (props.id) element.id = props.id;

  const size    = props.size ?? 'md';
  const baseClasses = `inline-flex items-center rounded-full border font-medium ${SIZE_CLASSES[size]} ${props.className ?? ''}`;

  const applyVariant = (v: string): void => {
    element.className = `${baseClasses} ${VARIANT_CLASSES[v] ?? VARIANT_CLASSES['neutral']}`;
  };

  if (typeof props.variant === 'object' && props.variant !== null && 'subscribe' in props.variant) {
    applyVariant(props.variant.value);
    cleanupFunctions.push(props.variant.subscribe(applyVariant));
  } else {
    applyVariant(props.variant ?? 'neutral');
  }

  const applyText = (t: string): void => { element.textContent = t; };
  if (typeof props.text === 'object' && props.text !== null && 'subscribe' in props.text) {
    applyText(props.text.value);
    cleanupFunctions.push(props.text.subscribe(applyText));
  } else if (props.text !== undefined) {
    applyText(props.text);
  }

  return {
    element,
    cleanup: { destroy: () => cleanupFunctions.forEach(fn => fn()) },
  };
};
