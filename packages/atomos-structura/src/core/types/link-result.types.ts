import type { EdgePosition } from '../../features/edge/types/edge-position.types.js';

export interface LinkResult {
  readonly element: SVGPathElement;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly updatePath: (
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    srcEdge?: EdgePosition,
    dstEdge?: EdgePosition
  ) => void;
  readonly setTemporary: (temporary: boolean) => void;
  readonly setValidity: (isValid: boolean) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
