import type { Signal } from '../../../core/types/signal.types';

export interface InputProps {
  readonly type: 'text' | 'number' | 'email' | 'password' | 'search' | 'color';
  readonly value?: string | Signal<string>;
  readonly placeholder?: string;
  readonly disabled?: boolean | Signal<boolean>;
  readonly readonly?: boolean;
  readonly className?: string;
  readonly id?: string;
  readonly onChange?: (value: string) => void;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
}

export interface InputResult {
  readonly element: HTMLInputElement;
  readonly cleanup: { destroy: () => void };
}