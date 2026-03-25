import type { EdgePosition } from '../shared/edge-position';
import type { EdgeThickness } from '../shared/edge-thickness';
import type { AnchorProps } from './anchor.types';

export type { EdgeThickness };

export interface EdgeProps {
  readonly position: EdgePosition;
  readonly entityId: string;
  readonly thickness: EdgeThickness;
  readonly anchors: AnchorProps[];
  readonly isHighlighted: boolean;
}