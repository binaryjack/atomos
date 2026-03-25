// Shared
export type { EdgePosition, EdgeThickness, RenderType, Cardinality, ComponentType, Theme, DataType } from './shared/index';
export { DATA_TYPES } from './shared/index';

// Types
export type { BaseEntityProps } from './types/base-entity.types';
export type { PropertyProps } from './types/property.types';
export type { PropertiesRowProps } from './types/properties-row.types';
export type { AnchorProps } from './types/anchor.types';
export type { EdgeProps } from './types/edge.types';
export type { LinkProps } from './types/link.types';
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

// Schemas (f.object definitions — one per model)
export { baseEntitySchema, anchorSchema, edgeSchema, linkSchema, settingsSchema, entitySchema } from './schemas/index';

// Factories + schema builder (f from @binaryjack/formular.dev)
export { f, createProperty, createEntity } from './factories/index';
export type { CreatePropertyOptions, CreateEntityOptions } from './factories/index';