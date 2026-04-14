import type { EdgePosition } from '../../features/edge/types/edge-position.types.js';
import type { RenderType } from '@atomos-web/structura-core';

export interface LinkProps {
  readonly id: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId?: string;
  readonly sourcePosition: { x: number; y: number };
  readonly targetPosition: { x: number; y: number };
  readonly sourceEdge?: EdgePosition;
  readonly targetEdge?: EdgePosition;
  readonly temporary?: boolean;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly animated?: boolean;
  readonly renderType?: RenderType;
}
