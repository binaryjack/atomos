import type { Signal } from '../../../core/types/signal.types.js';

export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';
export type AnchorState = 'idle' | 'hover' | 'dragging' | 'connecting' | 'connected';

export interface AnchorProps {
  readonly id: string;
  readonly position: Signal<{ x: number; y: number }>;
  readonly edgePosition: EdgePosition;
  readonly connected: boolean;
  readonly linkId?: string;
  readonly radius: number;
  readonly state?: AnchorState;
  readonly onConnect?: (linkId: string) => void;
  readonly onDisconnect?: () => void;
  readonly onMouseDown?: (event: MouseEvent) => void;
  readonly onStateChange?: (state: AnchorState) => void;
}

export interface AnchorResult {
  readonly element: SVGGElement;
  readonly updateState: (state: AnchorState) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}