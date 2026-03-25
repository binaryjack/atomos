import type { EdgePosition } from '../shared/edge-position';

export type { EdgePosition };

export interface AnchorProps {
  readonly id: string;
  readonly edgePosition: EdgePosition;
  readonly offset: number;
  readonly linkId: string | undefined;
}