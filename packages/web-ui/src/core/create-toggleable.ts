import type { Signal } from './types/signal.types.js';
import { createSignal } from './create-signal.js';

export type ToggleState = 'open' | 'closed';

export interface Toggleable {
  readonly state: Signal<ToggleState>;
  readonly open:   () => void;
  readonly close:  () => void;
  readonly toggle: () => void;
}

export const createToggleable = function(initial: ToggleState = 'closed'): Toggleable {
  const state = createSignal<ToggleState>(initial);
  return {
    state,
    open:   () => state.set('open'),
    close:  () => state.set('closed'),
    toggle: () => state.set(state.value === 'open' ? 'closed' : 'open'),
  };
};
