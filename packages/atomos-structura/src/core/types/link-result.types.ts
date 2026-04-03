import type { EdgePosition } from '../../features/edge/types/edge-position.types.js';
import type { RenderType } from '@atomos/structura-core';

export interface LinkResult {
  readonly element: SVGPathElement;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly updatePath: (
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    srcEdge?: EdgePosition,
    dstEdge?: EdgePosition,
    renderType?: RenderType
  ) => void;
  readonly setTemporary: (temporary: boolean) => void;
  readonly setValidity: (isValid: boolean) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
