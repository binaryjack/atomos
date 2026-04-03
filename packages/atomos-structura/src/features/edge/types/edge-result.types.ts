import type { EdgeState } from './edge-state.types.js';

export interface EdgeResult {
  readonly element: SVGGElement;
  readonly updateState: (state: EdgeState) => void;
  readonly getAnchorPosition: () => { x: number; y: number };
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
