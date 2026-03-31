import type { Signal } from '../../../core/types/signal.types.js';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize    = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  readonly variant?:   BadgeVariant | Signal<BadgeVariant>;
  readonly size?:      BadgeSize;
  readonly text?:      string | Signal<string>;
  readonly className?: string;
  readonly id?:        string;
}

export interface BadgeResult {
  readonly element: HTMLSpanElement;
  readonly cleanup: { destroy: () => void };
}
