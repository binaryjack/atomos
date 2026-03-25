// Types
export type { BaseEntityProps } from './types/base-entity.types';
export type { PropertyProps, PropertyType, ComponentType } from './types/property.types';
export type { PropertiesRowProps } from './types/properties-row.types';
export type { AnchorProps, EdgePosition } from './types/anchor.types';
export type { EdgeProps, EdgeThickness } from './types/edge.types';
export type { LinkProps, RenderType, Cardinality } from './types/link.types';
export type { EntityProps, Position, Dimensions } from './types/entity.types';
export type { SettingsProps } from './types/settings.types';

// Constructors
export { baseEntity } from './base-entity';
export { property } from './property';
export { propertiesRow } from './properties-row';
export { anchor } from './anchor';
export { edge } from './edge';
export { link } from './link';
export { entity } from './entity';
export { settings } from './settings';

// Factories + schema builder
export { f, createProperty, createEntity } from './factories/index';
export type { CreatePropertyOptions, CreateEntityOptions } from './factories/index';