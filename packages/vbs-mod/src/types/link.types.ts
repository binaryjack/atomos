import type { RenderType } from '../shared/render-type';
import type { Cardinality } from '../shared/cardinality';

export type { RenderType, Cardinality };

export interface LinkProps {
  readonly id: string;
  readonly leftEntityId: string;
  readonly rightEntityId: string;
  readonly leftCardinality: Cardinality;
  readonly rightCardinality: Cardinality;
  readonly renderType: RenderType;
  readonly leftAnchorId: string;
  readonly rightAnchorId: string;
  readonly leftProperty?: string;
  readonly rightProperty?: string;
}