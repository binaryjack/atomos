import type { Signal } from '../../../core/types/signal.types.js'

export interface CircularProgressProps {
  readonly value: number | Signal<number>; // 0 to 100
  readonly size?: number; // pixel size 
  readonly strokeWidth?: number;
  readonly variant?: 'primary' | 'success' | 'warn' | 'danger' | 'info'; 
  readonly showLabel?: boolean;
  readonly className?: string;
}

export interface CircularProgressResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}
