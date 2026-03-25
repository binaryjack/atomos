import type { Signal } from '../../../core/types/signal.types.js';
import type { EntityProps } from '@vbs/vbs-mod';
import type { GlobalConfig } from '../../../core/types/global-config.types.js';
import type { WorkspaceManager } from '../../../core/types/workspace-manager.types.js';
import type { EntityInstance } from '../../../core/types/entity-instance.types.js';

export interface DemoEntityProps {
  readonly id: string;
  readonly entitySignal: Signal<EntityProps>;
  readonly globalConfig: Signal<GlobalConfig>;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly workspace: WorkspaceManager;
}

export interface DemoEntityResult {
  readonly element: SVGGElement;
  readonly edgeElements: SVGGElement[];
  readonly instance: EntityInstance;
  readonly cleanup: () => void;
}
