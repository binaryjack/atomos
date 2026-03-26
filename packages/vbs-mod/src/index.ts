// Shared
export type { EdgePosition, EdgeThickness, RenderType, Cardinality, ComponentType, Theme, DataType } from './shared/index';
export { DATA_TYPES } from './shared/index';

// Types
export type { BaseEntity } from './types/base-entity.types';
export type { Property } from './types/property.types';
export type { AnchorProps } from './types/anchor.types';
export type { EdgeProps } from './types/edge.types';
export type { LinkProps } from './types/link.types';
export type { Entity, Position, Dimensions } from './types/entity.types';
export type { SettingsProps } from './types/settings.types';

// Schemas (f.object definitions — one per model)
export { baseEntitySchema, anchorSchema, edgeSchema, linkSchema, settingsSchema, entitySchema } from './schemas/index';

// Factories + schema builder (f from @binaryjack/formular.dev)
export { f, createProperty, createEntity } from './factories/index';
export type { CreatePropertyOptions, CreateEntityOptions } from './factories/index';