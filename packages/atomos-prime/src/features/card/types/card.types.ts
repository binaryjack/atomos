import type { Signal } from '../../../core/types/signal.types.js';

export interface CardProps {
  children?: HTMLElement[] | Signal<HTMLElement[]>;
  title?: string | Signal<string>;
  subtitle?: string | Signal<string>;
  className?: string;
  onClick?: () => void;
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  padding?: 'sm' | 'md' | 'lg';
}

export interface CardResult {
  element: HTMLDivElement;
  header?: HTMLDivElement;
  content: HTMLDivElement;
  cleanup: {
    destroy: () => void;
  };
}