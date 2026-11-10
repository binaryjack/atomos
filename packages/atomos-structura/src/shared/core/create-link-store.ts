import type { Signal } from '@atomos-web/prime';
import type { LinkProps } from '@atomos-web/structura-core';
import { registry } from './create-signal-registry.js';
import { linkKey } from './registry-keys.js';

export interface LinkStore {
  readonly signal: Signal<LinkProps>;
}

export const createLinkStore = function(link: LinkProps): LinkStore {
  const signal = registry.getOrCreate<LinkProps>(linkKey(link.id), link);
  return { signal };
};
