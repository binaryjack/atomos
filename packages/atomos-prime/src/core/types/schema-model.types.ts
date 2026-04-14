import type { Entity, LinkProps } from '@atomos-web/structura-core';
import type { EntityCanvasState } from './entity-canvas-state.types.js';

export interface SchemaModel {
  readonly id: string;
  readonly name: string;
  readonly entities: Entity[];
  readonly links: LinkProps[];
  /** Canvas layout — position+dimensions per entity */
  readonly canvasStates: EntityCanvasState[];
}
