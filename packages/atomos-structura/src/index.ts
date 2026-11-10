export { createSchemaBuilder, type SchemaBuilderProps, type SchemaBuilder } from './app/schema-builder/schema-builder.js';
export { createSchemaBuilderState, type SchemaBuilderState } from './shared/core/schema-builder-state.js';
export * from './shared/core/create-schema-graph-kernel.js';
export { createPrismaAdapter } from './shared/adapters/create-prisma-adapter.js';
export { createSqlAdapter } from './shared/adapters/create-sql-adapter.js';
export { createTypescriptAdapter } from './shared/adapters/create-typescript-adapter.js';
export * from './shared/core/adapters/react-connector.js';
export { createKernelAdapter } from './shared/adapters/create-kernel-adapter.js';
export { create_redux_store, getGlobalReduxStore, resetGlobalReduxStore, createInstanceReduxStore, storeInstanceReduxStore, getInstanceReduxStore, destroyInstanceReduxStore } from './shared/core/create-redux-store.js';
export type { ReduxState, ReduxAction, ReduxStore, SchemaModel, ViewportState, CanvasModel, WorkspaceState } from './shared/types/redux-state.types.js';
export { createWorkspaceApi, type WorkspaceApi, type WorkspaceSchemaInfo, type WorkspaceCanvasInfo } from './shared/core/create-workspace-api.js';
export type { AppSettings, EntityStyleSettings, LinkStyleSettings, CustomShape } from './features/settings-page/types/settings-page.types.js';
export { createMcpSync, type McpSyncOptions, type McpSyncResult, type McpTransport, type McpStatus, type McpServerEvent, type McpToolResult, type Disposable } from './features/mcp-sync/create-mcp-sync.js';
export { createInMemoryMcpTransport, type InMemoryMcpTransport } from './features/mcp-sync/create-in-memory-mcp-transport.js';
export type { WorkspaceConfig, MenuItemConfig, WorkspaceMenuConfig } from '@atomos-web/structura-core';
export { createMenuControl } from './shared/core/create-menu-control.js';
export type { MenuControl } from './shared/types/menu-control.types.js';
export { getCanvasAdapterFor, destroyCanvasAdapter, destroyLegacyCanvasAdapter } from './shared/core/adapters/canvas-adapter.js';
export type { CanvasAdapter } from './shared/core/adapters/canvas-adapter.js';
export * from './widgets/structura-viewer/index.js';

// Newly added exports to prevent deep imports from showcase
export { createCanvasPage } from './pages/canvas-page/create-canvas-page.js';
export { getEntityManager, destroyEntityManager } from './shared/core/presentation/entity-manager.js';
export { applySchemaCommands } from './shared/core/application/dag-service.js';
export { initToolboxConfigManager, setAppearanceSettings, setToolboxConfig, setCustomShapes, setGeneralSettings } from './shared/core/adapters/toolbox-config-manager.js';
export { applyAppearanceTokens } from './shared/core/presentation/design-system.js';
export * from './shared/core/application/dag-service.js';
export type { EntityManager } from './shared/core/presentation/entity-manager.js';
export { AtomosPresentationEngine } from './widgets/structura-viewer/atomos-presentation-engine.js';
export { toMermaid, fromMermaid } from './shared/adapters/mermaid.js';
export { createMinimap } from './features/minimap/create-minimap.js';
export { createViewportCuller, type ViewportCuller } from './shared/core/viewport-culler.js';

// Neura 3D WebGL Graph Engine
export * from './widgets/neura/index.js';

// Versioned workflow canvas document (schemaVersion 2)
export * from './shared/workflow-document/index.js';

// Workflow designer canvas: typed ports, node types, connection validation, overlay, events
export * from './features/workflow-canvas/index.js';

// Graph Diff & Standalone Exporters
export * from './features/diff/create-graph-diff-engine.js';
export * from './features/export/create-standalone-html-exporter.js';

