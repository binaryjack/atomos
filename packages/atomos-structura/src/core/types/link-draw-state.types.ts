import type { EdgePosition } from '../../features/edge/types/edge-position.types.js';

export interface LinkDrawState {
  readonly tempLinkId: string;
  readonly sourcePos: { x: number; y: number };
  readonly srcAnchorId: string;
  readonly srcEntityId: string;
  readonly srcEdge: EdgePosition;
}
