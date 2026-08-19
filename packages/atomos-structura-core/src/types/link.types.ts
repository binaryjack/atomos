import type { RenderType } from '../shared/render-type';
import type { Cardinality } from '../shared/cardinality';

export type { RenderType, Cardinality };

export interface Waypoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface LinkProps {
  readonly id: string;
  readonly leftEntityId: string;
  readonly rightEntityId: string;
  readonly leftCardinality: Cardinality;
  readonly rightCardinality: Cardinality;
  readonly renderType: RenderType;
  readonly leftAnchorId: string;
  readonly rightAnchorId: string;
  readonly leftProperty?: string | undefined;
  readonly rightProperty?: string | undefined;
  readonly direction?: 'default' | 'left' | 'right' | undefined;
  readonly waypoints?: readonly Waypoint[] | undefined;
  readonly style?: 'bezier' | 'orthogonal' | 'straight' | undefined;
}