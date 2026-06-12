import type { Signal } from '../../../core/types/signal.types.js'

export type IconName = 'check' | 'close' | 'arrow-up' | 'arrow-down' | 'chevron-down' | 'chevron-up' | 'arrow-left' | 'arrow-right' | 'plus' | 'minus' | 'edit' | 'delete' | 'search' | 'menu' | 'settings' | 'user' | 'database' | 'code' | 'download' | 'upload' | 'link' | 'image' | 'play' | 'stop' | 'refresh';

export interface IconProps {
  name: IconName | Signal<IconName>;
  size?: number | string;
  color?: string | Signal<string>;
  className?: string;
  onClick?: () => void;
}

export interface IconResult {
  element: SVGElement;
  cleanup: {
    destroy: () => void;
  };
}