import type { BaseEntity } from './base-entity.types';
import type { EdgeProps } from './edge.types';
import type { EntityShape } from './entity-shape.types';
import type { Property } from './property.types';

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export interface Entity extends BaseEntity {
  readonly name: string;
  readonly shape?: EntityShape;
  readonly nodeType?: string;
  readonly properties: Property[];
  readonly position: Position;
  readonly dimensions: Dimensions;
  readonly edges: EdgeProps[];
  readonly collapsed?: boolean;
  readonly defaultCollapsed?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export type BoundaryType = 'vpc' | 'cluster' | 'subnet' | 'domain' | 'custom';

export interface ZoneEntity extends Entity {
  readonly nodeType: 'zone';
  readonly boundaryType: BoundaryType;
  readonly tintColor: string;
  readonly containedEntityIds: string[];
  readonly isLocked?: boolean;
}

export interface StickyNoteEntity extends Entity {
  readonly nodeType: 'sticky-note';
  readonly noteColor: string;
  readonly content: string;
  readonly author?: string;
}