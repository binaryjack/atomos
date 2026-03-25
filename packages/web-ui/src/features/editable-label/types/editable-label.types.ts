import type { Signal } from '../../../core/types/signal.types.js';

export interface EditableLabelProps {
  readonly value: Signal<string>;
  readonly placeholder?: string;
  readonly className?: string;
  readonly inputClassName?: string;
  readonly onChange: (value: string) => void;
}

export interface EditableLabelResult {
  readonly element: HTMLSpanElement;
  readonly cleanup: { destroy: () => void };
}
