import type { Signal } from '../../../core/types/signal.types.js';

export interface AccordionProps {
  title: string | Signal<string> | HTMLElement;
  children?: HTMLElement[] | Signal<HTMLElement[]>;
  defaultOpen?: boolean;
  disabled?: boolean | Signal<boolean>;
  className?: string;
  onToggle?: (isOpen: boolean) => void;
}

export interface AccordionResult {
  element: HTMLDivElement;
  toggle: () => void;
  isOpen: () => boolean;
  cleanup: {
    destroy: () => void;
  };
}