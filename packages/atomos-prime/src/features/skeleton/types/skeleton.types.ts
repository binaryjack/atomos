import type { Signal } from '../../../core/types/signal.types.js';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: boolean | Signal<boolean>;
  className?: string;
}

export interface SkeletonResult {
  element: HTMLDivElement;
  cleanup: {
    destroy: () => void;
  };
}