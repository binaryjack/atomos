export { createSchemaBuilder, type SchemaBuilderProps, type SchemaBuilder } from './core/schema-builder.js';
export { createSchemaBuilderState, type SchemaBuilderState } from './core/schema-builder-state.js';
export * from './core/create-schema-graph-kernel.js';
export { createPrismaAdapter } from './adapters/create-prisma-adapter.js';
export { createSqlAdapter } from './adapters/create-sql-adapter.js';
export { createTypescriptAdapter } from './adapters/create-typescript-adapter.js';
export * from './core/adapters/react-connector.js';
export { createKernelAdapter } from './adapters/create-kernel-adapter.js';
export { create_redux_store, getGlobalReduxStore, resetGlobalReduxStore, createInstanceReduxStore, storeInstanceReduxStore, getInstanceReduxStore, destroyInstanceReduxStore } from './core/create-redux-store.js';
export type { ReduxState, ReduxAction, ReduxStore, SchemaModel, ViewportState, CanvasModel, WorkspaceState } from './types/redux-state.types.js';
export { createWorkspaceApi, type WorkspaceApi, type WorkspaceSchemaInfo, type WorkspaceCanvasInfo } from './core/create-workspace-api.js';
export type { AppSettings, EntityStyleSettings, LinkStyleSettings, CustomShape } from './features/settings-page/types/settings-page.types.js';
export { createMcpSync, type McpSyncResult } from './features/mcp-sync/create-mcp-sync.js';
export type { WorkspaceConfig, MenuItemConfig, WorkspaceMenuConfig } from '@atomos-web/structura-core';
export { createMenuControl } from './core/create-menu-control.js';
export type { MenuControl } from './types/menu-control.types.js';
export { getCanvasAdapterFor, destroyCanvasAdapter, destroyLegacyCanvasAdapter } from './core/adapters/canvas-adapter.js';
export type { CanvasAdapter } from './core/adapters/canvas-adapter.js';
export * from './viewer/index.js';

// Newly added exports to prevent deep imports from showcase
export { createCanvasPage } from './preview/create-canvas-page.js';
export { getEntityManager, destroyEntityManager } from './core/presentation/entity-manager.js';
export { applySchemaCommands } from './core/application/dag-service.js';
export { initToolboxConfigManager, setAppearanceSettings, setToolboxConfig, setCustomShapes, setGeneralSettings } from './core/adapters/toolbox-config-manager.js';
export { applyAppearanceTokens } from './core/presentation/design-system.js';
export * from './core/application/dag-service.js';
export { AtomosPresentationEngine } from './viewer/atomos-presentation-engine.js';
export { toMermaid, fromMermaid } from './adapters/mermaid.js';
