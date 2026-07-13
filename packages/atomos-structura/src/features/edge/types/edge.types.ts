import type { EntityShape } from '@atomos-web/structura-core'
import type { Signal } from '@atomos-web/prime'

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';
export type EdgeState = 'default' | 'hover' | 'active' | 'connected';

export interface EdgeProps {
  readonly position: EdgePosition;
  readonly entityId: string;
  readonly shape?: EntityShape | undefined;
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

export interface EdgeResult {
  readonly element: SVGGElement;
  readonly updateState: (state: EdgeState) => void;
  readonly getAnchorPosition: () => { x: number; y: number };
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
