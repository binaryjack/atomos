import type { Signal } from '@atomos-web/prime';
import type { EdgePosition } from './edge-position.types.js';
import type { EdgeState } from './edge-state.types.js';

export interface EdgeProps {
  readonly position: EdgePosition;
  readonly entityId: string;
  readonly entityPosition: Signal<{ x: number; y: number }>;
  readonly entityDimensions: Signal<{ width: number; height: number }>;
  readonly thickness: 3 | 5;
  readonly state?: EdgeState;
  readonly anchorId: string;
  readonly onHover?: (hovered: boolean) => void;
  readonly onStateChange?: (state: EdgeState) => void;
  readonly onAnchorConnect?: (anchorId: string, linkId: string) => void;
  readonly onAnchorMouseDown?: (event: MouseEvent, anchorId: string) => void;
  readonly onAnchorMouseUp?: (event: MouseEvent, anchorId: string) => void;
}
