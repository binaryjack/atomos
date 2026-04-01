import type { Signal } from '../../../core/types/signal.types';

export interface ButtonProps {
  readonly variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
  readonly size: 'sm' | 'md' | 'lg';
  readonly shape?: 'rounded' | 'pill' | 'icon-only';
  readonly leftIcon?: HTMLElement;
  readonly rightIcon?: HTMLElement;
  readonly children?: string | Signal<string>;
  readonly disabled?: boolean | Signal<boolean>;
  readonly loading?: boolean | Signal<boolean>;
  readonly className?: string;
  readonly type?: 'button' | 'submit' | 'reset';
  readonly id?: string;
  readonly onClick?: (event: MouseEvent) => void;
}

export interface ButtonResult {
  readonly element: HTMLButtonElement;
  readonly cleanup: { destroy: () => void };
}