import type { EntityProps, LinkProps } from '@vbs/vbs-mod';
import type { EntityCanvasState } from './entity-canvas-state.types.js';

export interface SchemaModel {
  readonly id: string;
  readonly name: string;
  readonly entities: EntityProps[];
  readonly links: LinkProps[];
  /** Canvas layout — position+dimensions per entity */
  readonly canvasStates: EntityCanvasState[];
}
