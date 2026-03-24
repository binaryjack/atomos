export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';
export type EdgeState = 'default' | 'hover' | 'active' | 'connected';

export interface EdgeProps {
  readonly position: EdgePosition;
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly thickness: 3 | 5;
  readonly hovered: boolean;
  readonly state?: EdgeState;
  readonly anchorId: string;
  readonly onHover?: (hovered: boolean) => void;
  readonly onStateChange?: (state: EdgeState) => void;
  readonly onAnchorConnect?: (anchorId: string, linkId: string) => void;
}

export interface EdgeResult {
  readonly element: SVGGElement;
  readonly updateState: (state: EdgeState) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}