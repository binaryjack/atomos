import type { Signal } from './types/signal.types.js';
import type { GlobalConfig } from './types/global-config.types.js';
import { registry } from './create-signal-registry.js';
import { GLOBAL_KEY } from './registry-keys.js';
import { DEFAULT_GLOBAL_CONFIG } from './types/global-config.types.js';

const LS_KEY = 'vbe2:global';

export interface GlobalStore {
  readonly signal: Signal<GlobalConfig>;
  readonly update: (patch: Partial<GlobalConfig>) => void;
  readonly cleanup: { destroy: () => void };
}

export const createGlobalStore = function(): GlobalStore {
    const initial: GlobalConfig = DEFAULT_GLOBAL_CONFIG;

  const signal = registry.getOrCreate<GlobalConfig>(GLOBAL_KEY, initial);

  const update = (patch: Partial<GlobalConfig>): void => {
    signal.set({ ...signal.value, ...patch });
  };


  return {
    signal,
    update,
    cleanup: { destroy: () => {} },

  };
};
