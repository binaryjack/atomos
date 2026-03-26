import type { Signal } from '../../../core/types/signal.types.js';
import type { Entity } from '@vbs/vbs-mod';
import type { GlobalConfig } from '../../../core/types/global-config.types.js';
import type { WorkspaceManager } from '../../../core/types/workspace-manager.types.js';
import type { EntityInstance } from '../../../core/types/entity-instance.types.js';
import type { IStorageProvider } from '../../../core/storage/types/storage-provider.types.js';

export interface DemoEntityProps {
  readonly id: string;
  readonly entitySignal: Signal<Entity>;
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
