// Shared
export type { Cardinality, ComponentType, DataType, EdgePosition, EdgeThickness, RenderType, Theme } from './shared/index';
export { DATA_TYPES, COMPONENT_TYPES } from './shared/index.js';
export type { AnchorProps } from './types/anchor.types.js';
export type { BaseEntity } from './types/base-entity.types.js';
export type { EdgeProps } from './types/edge.types.js';
export type { EntityShape } from './types/entity-shape.types.js';
export type { BoundaryType, Dimensions, Entity, Position, StickyNoteEntity, ZoneEntity } from './types/entity.types.js';
export type { LinkProps, Waypoint } from './types/link.types.js';
export type { Property } from './types/property.types.js';
export type { SettingsProps } from './types/settings.types.js';
export type { ConnectionConstraint, TopologicalRules } from './types/topology.types.js';
export type { WorkspaceConfig } from './types/workspace-config.types.js';
export type { MenuItemConfig, WorkspaceMenuConfig } from './types/menu-config.types.js';

// Schemas (f.object definitions — one per model)
export { anchorSchema, baseEntitySchema, edgeSchema, entitySchema, linkSchema, settingsSchema, dagExchangeSchema, universalSchema } from './schemas/index.js';

// Factories + schema builder (f from @binaryjack/formular.dev)
export { createEntity, createProperty, createStickyNoteEntity, createZoneEntity, f } from './factories/index.js';
export type { CreateEntityOptions, CreatePropertyOptions, CreateStickyNoteOptions, CreateZoneOptions } from './factories/index.js';

// Reverse-Engineering Parsers
export { parsePrismaSchema } from './adapters/parsers/prisma-parser.js';
export { parseSqlDDL } from './adapters/parsers/sql-ddl-parser.js';
export { parseTypeScriptAST } from './adapters/parsers/typescript-parser.js';
export type { ParsedSchemaResult } from './adapters/parsers/prisma-parser.js';

// Graph Analytics
export { findCycles } from './analysis/cycle-detector.js';
export type { CycleDetectionResult } from './analysis/cycle-detector.js';

