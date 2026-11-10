import type { Signal } from '@atomos-web/prime'
import type { Entity, PortSpec } from '@atomos-web/structura-core'
import type { EntityStore } from '../../../shared/core/create-entity-store.js'
import type { IStorageProvider } from '../../../shared/core/storage/types/storage-provider.types.js'
import type { EntityInstance } from '../../../shared/core/types/entity-instance.types.js'
import type { GlobalConfig } from '../../../shared/core/types/global-config.types.js'
import type { WorkspaceManager } from '../../../shared/core/types/workspace-manager.types.js'

export interface DemoEntityProps {
  readonly instanceId: string;
  readonly id: string;
  readonly shape?: string | undefined;
  readonly color?: string | undefined;
  readonly entityStore: EntityStore;
  readonly globalConfig: Signal<GlobalConfig>;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly workspace: WorkspaceManager;
  readonly storageProvider: IStorageProvider<Entity>;
  readonly isReadonly?: boolean;
  /** Display name, used for the node's accessible label. */
  readonly name?: string | undefined;
  /** Typed ports: when non-empty they replace the four ER side anchors. */
  readonly ports?: readonly PortSpec[] | undefined;
  /** Custom body renderer from the node type definition (replaces the default table body). */
  readonly renderBody?: ((size: { width: number; height: number }) => HTMLElement) | undefined;
}

export interface DemoEntityResult {
  readonly element: SVGGElement;
  readonly edgeElements: SVGGElement[];
  readonly instance: EntityInstance;
  readonly cleanup: () => void;
}
