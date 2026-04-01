import type { Signal } from '../../../core/types/signal.types.js';

export interface TypographyProps {
  readonly variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  readonly children: string | Signal<string>;
  readonly className?: string;
  readonly id?: string;
}

export interface TypographyResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}