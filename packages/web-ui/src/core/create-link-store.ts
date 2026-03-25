import type { Signal } from './types/signal.types.js';
import type { LinkProps } from '@vbs/vbs-mod';
import { registry } from './create-signal-registry.js';
import { linkKey } from './registry-keys.js';

export interface LinkStore {
  readonly signal: Signal<LinkProps>;
}

export const createLinkStore = function(link: LinkProps): LinkStore {
  const signal = registry.getOrCreate<LinkProps>(linkKey(link.id), link);
  return { signal };
};
