import type { EntityInstance } from './entity-instance.types.js';
import type { WorkspaceManager } from './workspace-manager.types.js';

export type EntitySpawnFactory = (
  id: string,
  position: { x: number; y: number },
  workspace: WorkspaceManager
) => EntityInstance;
