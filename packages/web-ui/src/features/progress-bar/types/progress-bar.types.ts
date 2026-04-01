import type { Signal } from '../../../core/types/signal.types.js';

export interface ProgressBarProps {
  readonly value: number | Signal<number>; // 0 to 100
  readonly orientation?: 'horizontal' | 'vertical'; // default 'horizontal'
  readonly reversible?: boolean; // default false
  readonly variant?: 'primary' | 'success' | 'warn' | 'danger' | 'info'; // default 'primary'
  readonly size?: 'sm' | 'md' | 'lg'; // default 'md'
  readonly showLabel?: boolean;
  readonly className?: string;
}

export interface ProgressBarResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}
