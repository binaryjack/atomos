import type { IValidationOptions } from '@binaryjack/formular.dev';

export interface ValidationBadgeProps {
  readonly validation?: IValidationOptions;
  readonly onClick?: () => void;
}

export interface ValidationBadgeResult {
  readonly element: HTMLDivElement;
  readonly update: (validation?: IValidationOptions) => void;
  readonly cleanup: { destroy: () => void };
}

export const createValidationBadge = function(
  props: ValidationBadgeProps
): ValidationBadgeResult {
  const container = document.createElement('div');
  container.className = 'inline-flex items-center gap-2';

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = [
    'inline-flex', 'items-center', 'gap-1',
    'px-2', 'py-1', 'rounded-md',
    'text-xs', 'font-medium',
    'transition-colors',
    'cursor-pointer',
  ].join(' ');

  const update = (validation?: IValidationOptions): void => {
    const count = countValidationRules(validation);
    
    if (count === 0) {
      badge.className = [
        'inline-flex', 'items-center', 'gap-1',
        'px-2', 'py-1', 'rounded-md',
        'text-xs', 'font-medium',
        'bg-gray-100', 'text-gray-600',
        'hover:bg-gray-200',
        'transition-colors',
        'cursor-pointer',
      ].join(' ');
      badge.textContent = 'No validation';
    } else {
      badge.className = [
        'inline-flex', 'items-center', 'gap-1',
        'px-2', 'py-1', 'rounded-md',
        'text-xs', 'font-medium',
        'bg-blue-100', 'text-blue-700',
        'hover:bg-blue-200',
        'transition-colors',
        'cursor-pointer',
      ].join(' ');
      badge.textContent = `${count} rule${count > 1 ? 's' : ''}`;
    }
  };

  if (props.onClick) {
    badge.onclick = props.onClick;
  }

  update(props.validation);
  container.appendChild(badge);

  return {
    element: container,
    update,
    cleanup: {
      destroy: () => {
        badge.onclick = null;
        container.remove();
      },
    },
  };
};

function countValidationRules(validation?: IValidationOptions): number {
  if (!validation) return 0;
  
  let count = 0;
  
  if (validation.required) count++;
  if (validation.minLength) count++;
  if (validation.maxLength) count++;
  if (validation.min) count++;
  if (validation.max) count++;
  if (validation.pattern) count++;
  
  return count;
}
