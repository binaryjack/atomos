// Shared
export type { Cardinality, ComponentType, DataType, EdgePosition, EdgeThickness, RenderType, Theme } from './shared/index';
export { DATA_TYPES, COMPONENT_TYPES } from './shared/index.js';
export type { AnchorProps } from './types/anchor.types.js';
export type { BaseEntity } from './types/base-entity.types.js';
export type { EdgeProps } from './types/edge.types.js';
export type { EntityShape } from './types/entity-shape.types.js';
export type { Dimensions, Entity, Position } from './types/entity.types.js';
export type { LinkProps } from './types/link.types.js';
export type { Property } from './types/property.types.js';
export type { SettingsProps } from './types/settings.types.js';
export type { ConnectionConstraint, TopologicalRules } from './types/topology.types.js';
export type { WorkspaceConfig } from './types/workspace-config.types.js';
export type { MenuItemConfig, WorkspaceMenuConfig } from './types/menu-config.types.js';

// Schemas (f.object definitions — one per model)
export { anchorSchema, baseEntitySchema, edgeSchema, entitySchema, linkSchema, settingsSchema } from './schemas/index.js';

// Factories + schema builder (f from @binaryjack/formular.dev)
export { createEntity, createProperty, f } from './factories/index.js';
export type { CreateEntityOptions, CreatePropertyOptions } from './factories/index.js';

