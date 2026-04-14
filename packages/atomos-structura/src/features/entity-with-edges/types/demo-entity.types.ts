import type { Entity } from '@atomos-web/structura-core';
import type { EntityStore } from '../../../core/create-entity-store.js';
import type { IStorageProvider } from '../../../core/storage/types/storage-provider.types.js';
import type { EntityInstance } from '../../../core/types/entity-instance.types.js';
import type { GlobalConfig } from '../../../core/types/global-config.types.js';
import type { Signal } from '@atomos-web/prime';
import type { WorkspaceManager } from '../../../core/types/workspace-manager.types.js';

export interface DemoEntityProps {
  readonly id: string;
  readonly shape?: string | undefined;
  readonly color?: string | undefined;
  readonly entityStore: EntityStore;
  readonly globalConfig: Signal<GlobalConfig>;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly workspace: WorkspaceManager;
  readonly storageProvider: IStorageProvider<Entity>;
}

export interface DemoEntityResult {
  readonly element: SVGGElement;
  readonly edgeElements: SVGGElement[];
  readonly instance: EntityInstance;
  readonly cleanup: () => void;
}
