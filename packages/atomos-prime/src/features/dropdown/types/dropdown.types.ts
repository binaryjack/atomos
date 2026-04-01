import type { Signal } from '../../../core/types/signal.types.js';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface DropdownProps {
  id?: string;
  name?: string;
  value?: string | Signal<string>;
  placeholder?: string | Signal<string>;
  options: DropdownOption[] | Signal<DropdownOption[]>;
  disabled?: boolean | Signal<boolean>;
  className?: string;
  onChange?: (value: string) => void;
}

export interface DropdownResult {
  element: HTMLDivElement;
  select: HTMLSelectElement;
  cleanup: {
    destroy: () => void;
  };
}