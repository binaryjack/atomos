import type { Entity, LinkProps } from '@atomos/structura-core';
import type { EntityCanvasState } from './entity-canvas-state.types.js';

export interface SchemaModel {
  readonly id: string;
  readonly name: string;
  readonly entities: Entity[];
  readonly links: LinkProps[];
  /** Canvas layout — position+dimensions per entity */
  readonly canvasStates: EntityCanvasState[];
}
