import type { Signal } from '../../../core/types/signal.types.js';

export type ToggleSize  = 'sm' | 'md' | 'lg';

export interface ToggleProps {
  readonly checked?:       boolean | Signal<boolean>;
  readonly disabled?:      boolean | Signal<boolean>;
  readonly error?:         boolean;
  readonly size?:          ToggleSize;
  readonly label?:         string;
  readonly labelPosition?: 'left' | 'right';
  readonly className?:     string;
  readonly id?:            string;
  readonly onChange?:      (checked: boolean) => void;
}

export interface ToggleResult {
  readonly element:     HTMLElement;
  readonly getChecked:  () => boolean;
  readonly cleanup:     { destroy: () => void };
}
