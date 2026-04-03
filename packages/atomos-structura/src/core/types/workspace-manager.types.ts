import type { Signal } from './signal.types.js';
import type { WorkspaceState } from './workspace-state.types.js';
import type { EntityInstance } from './entity-instance.types.js';
import type { EntitySpawnFactory } from './entity-spawn-factory.types.js';
import type { InteractiveBehaviorManager } from './interactive-behavior-manager.types.js';
import type { LinkManager } from './link-manager.types.js';
import type { EdgePosition } from '../../features/edge/types/edge-position.types.js';

export interface WorkspaceManager {
  readonly workspaceState: Signal<WorkspaceState>;
  readonly behaviorManager: InteractiveBehaviorManager;
  readonly linkManager: LinkManager;
  readonly registerEntity: (entity: EntityInstance) => void;
  readonly unregisterEntity: (entityId: string) => void;
  readonly screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  readonly startLinkFromAnchor: (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    srcEdge: EdgePosition,
    event: MouseEvent
  ) => void;
  readonly finalizeLinkToAnchor: (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    dstEdge: EdgePosition
  ) => void;
  readonly setEntitySpawnFactory: (factory: EntitySpawnFactory) => void;
  readonly appendToCanvas: (element: SVGElement) => void;
  readonly restoreLink: (
    linkId: string,
    srcAnchorId: string,
    srcPos: { x: number; y: number },
    srcEntityId: string,
    srcEdge: EdgePosition,
    dstAnchorId: string,
    dstPos: { x: number; y: number },
    dstEntityId: string,
    dstEdge: EdgePosition
  ) => void;
  readonly notifyAnchorHoverStart: (anchorId: string, entityId: string, edge: EdgePosition) => void;
  readonly notifyAnchorHoverEnd: () => void;
  readonly handleCanvasMouseMove: (event: MouseEvent) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
