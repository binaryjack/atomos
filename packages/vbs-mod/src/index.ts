// Shared
export type { EdgePosition, EdgeThickness, RenderType, Cardinality, ComponentType, Theme, DataType } from './shared/index';
export { DATA_TYPES } from './shared/index.js';

// Types
export type { BaseEntity } from './types/base-entity.types.js';
export type { Property } from './types/property.types.js';
export type { AnchorProps } from './types/anchor.types.js';
export type { EdgeProps } from './types/edge.types.js';
export type { LinkProps } from './types/link.types.js';
export type { Entity, Position, Dimensions } from './types/entity.types.js';
export type { SettingsProps } from './types/settings.types.js';

// Schemas (f.object definitions — one per model)
export { baseEntitySchema, anchorSchema, edgeSchema, linkSchema, settingsSchema, entitySchema } from './schemas/index.js';

// Factories + schema builder (f from @binaryjack/formular.dev)
export { f, createProperty, createEntity } from './factories/index.js';
export type { CreatePropertyOptions, CreateEntityOptions } from './factories/index.js';