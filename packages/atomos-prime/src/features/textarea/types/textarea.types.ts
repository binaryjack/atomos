import type { Signal } from '../../../core/types/signal.types.js';

export interface TextareaProps {
  id?: string;
  name?: string;
  value?: string | Signal<string>;
  placeholder?: string | Signal<string>;
  disabled?: boolean | Signal<boolean>;
  rows?: number;
  cols?: number;
  className?: string;
  onChange?: (value: string) => void;
  onInput?: (value: string) => void;
}

export interface TextareaResult {
  element: HTMLTextAreaElement;
  cleanup: {
    destroy: () => void;
  };
}