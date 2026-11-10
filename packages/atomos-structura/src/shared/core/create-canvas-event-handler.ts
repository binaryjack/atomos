import type { Signal } from '@atomos-web/prime'
import type { EdgePosition } from '../../features/edge/types/edge-position.types.js'
import { isPortAnchorId } from '../workflow-node/model/port-anchor.js'
import { getCanvasRuntime } from '../workflow-canvas/canvas-runtime.js'
import { previewConnection } from '../workflow-canvas/connection-gate.js'
import { getCanvasAdapter } from './adapters/canvas-adapter.js'
import { findLinkDropTarget } from './canvas-interaction/find-link-drop-target.js'
import type { LinkDrawController } from './create-link-draw-controller.js'
import type { LinkFinalizer } from './create-link-finalizer.js'
import { ENTITY_DEFAULT_HEIGHT, ENTITY_DEFAULT_WIDTH } from './entity-defaults.js'
import type { EntityInstance } from './types/entity-instance.types.js'
import type { EntitySpawnFactory } from './types/entity-spawn-factory.types.js'
import type { InteractiveBehaviorManager } from './types/interactive-behavior-manager.types.js'
import type { WorkspaceManager } from './types/workspace-manager.types.js'
import type { WorkspaceState } from './types/workspace-state.types.js'

export interface CanvasEventHandler {
  readonly handleCanvasMouseMove: (event: MouseEvent) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export interface CanvasEventHandlerDeps {
  readonly workspaceState: Signal<WorkspaceState>;
  readonly behaviorManager: InteractiveBehaviorManager;
  readonly linkDrawController: LinkDrawController;
  readonly linkFinalizer: LinkFinalizer;
  readonly screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  readonly registerEntity: (entity: EntityInstance) => void;
  readonly getSpawnFactory: () => EntitySpawnFactory | undefined;
  readonly getManager: () => WorkspaceManager;
  readonly onWorkspaceStateUpdate: (patch: Partial<WorkspaceState>) => void;
  readonly instanceId: string;
  readonly isReadonly?: () => boolean;
}

export const createCanvasEventHandler = function(
  svgContainer: SVGSVGElement,
  deps: CanvasEventHandlerDeps
): CanvasEventHandler {
  const {
    workspaceState, behaviorManager, linkDrawController, linkFinalizer,
    screenToSvgCoords, registerEntity, getSpawnFactory, getManager, onWorkspaceStateUpdate, instanceId
  } = deps;

  const portsOf = (entityId: string) => getCanvasAdapter(instanceId).getEntity(entityId)?.ports;

  const onCanvasMouseUp = (event: MouseEvent): void => {
    if (deps.isReadonly?.()) return;
    if (!linkDrawController.isDrawing()) return;
    const srcPos = linkDrawController.getActiveTempLinkSourcePos();
    const srcAnchorId = linkDrawController.getActiveTempSrcAnchorId();
    const srcEdge = linkDrawController.getActiveTempSrcEdge();
    const srcEntityId = linkDrawController.getActiveTempSrcEntityId();
    const optionalReconnectId = linkDrawController.consumeReconnectLinkId();
    if (!srcPos || !srcAnchorId || !srcEdge || !srcEntityId) return;

    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    // Spatial hit-test: nearest input port (typed drags) or nearest entity side (ER drags).
    const nearest = findLinkDropTarget(workspaceState, portsOf, srcEntityId, srcAnchorId, svgCoords);

    if (nearest) {
      linkDrawController.clearTempLink();
      linkFinalizer.finalizeLinkToAnchor(
        nearest.anchorId,
        nearest.position,
        nearest.entityId,
        nearest.edge,
        srcAnchorId,
        srcEntityId,
        srcEdge,
        srcPos,
        false,
        optionalReconnectId
      );
      behaviorManager.cancelLinkCreation();
      onWorkspaceStateUpdate({ linkCreationInProgress: false });
      return;
    }

    // Typed port drags never spawn ad-hoc entities: dropping on empty canvas cancels.
    const spawnFactory = isPortAnchorId(srcAnchorId) ? undefined : getSpawnFactory();
    if (spawnFactory) {
      const newId = `entity-${Date.now()}`;
      const newPos = {
        x: svgCoords.x - ENTITY_DEFAULT_WIDTH / 2,
        y: svgCoords.y - ENTITY_DEFAULT_HEIGHT / 2
      };
      const newEntity = spawnFactory(newId, newPos, getManager());
      registerEntity(newEntity);

      const dx = srcPos.x - svgCoords.x;
      const dy = srcPos.y - svgCoords.y;
      const dstEdge: EdgePosition = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'bottom' : 'top');

      const dims = newEntity.dimensions.value;
      const pos  = newEntity.position.value;
      const dstAnchorId = `${newId}-anchor-${dstEdge}`;
      const dstAnchorPos =
        dstEdge === 'top'    ? { x: pos.x + dims.width / 2, y: pos.y }                  :
        dstEdge === 'bottom' ? { x: pos.x + dims.width / 2, y: pos.y + dims.height }     :
        dstEdge === 'left'   ? { x: pos.x,                  y: pos.y + dims.height / 2 } :
                               { x: pos.x + dims.width,     y: pos.y + dims.height / 2 };

      linkDrawController.clearTempLink();
      linkFinalizer.finalizeLinkToAnchor(
        dstAnchorId,
        dstAnchorPos,
        newId,
        dstEdge,
        srcAnchorId,
        srcEntityId,
        srcEdge,
        srcPos,
        false,
        optionalReconnectId
      );
      behaviorManager.cancelLinkCreation();
      onWorkspaceStateUpdate({ linkCreationInProgress: false });
    } else {
      linkDrawController.clearTempLink();
      behaviorManager.cancelLinkCreation();
      onWorkspaceStateUpdate({ linkCreationInProgress: false });
    }
  };

  const onCanvasClick = (event: MouseEvent): void => {
    if (deps.isReadonly?.()) return;
    if (behaviorManager.behaviorState.value.linkCreation === 'drawing') return;
    if ((event.target as Element) === svgContainer || (event.target as Element).tagName === 'svg') {
      behaviorManager.selectEntity('');
      getCanvasRuntime(instanceId).selection.clear();
      onWorkspaceStateUpdate({ selectedEntityId: undefined });
    }
  };

  const handleCanvasMouseMove = (event: MouseEvent): void => {
    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    onWorkspaceStateUpdate({ cursorPosition: svgCoords });

    if (linkDrawController.isDrawing()) {
      behaviorManager.updateLinkDrawing(svgCoords);
      linkDrawController.updateTempLink(svgCoords);

      const srcEntityId = linkDrawController.getActiveTempSrcEntityId();
      const srcAnchorId = linkDrawController.getActiveTempSrcAnchorId();
      if (srcEntityId && srcAnchorId) {
        // Live feedback: the temp link turns invalid over a target the gate would reject.
        const nearest = findLinkDropTarget(workspaceState, portsOf, srcEntityId, srcAnchorId, svgCoords);
        const verdict = nearest
          ? previewConnection(instanceId, { entityId: srcEntityId, anchorId: srcAnchorId }, { entityId: nearest.entityId, anchorId: nearest.anchorId }, linkDrawController.getReconnectLinkId())
          : { ok: true };
        linkDrawController.setTempLinkValidity(verdict.ok);
      }
    }
  };

  // Cancelling a drawing (Escape on the canvas host, readonly switch, …) resets the behaviour
  // state; drop the temporary link whenever that happens. No global keyboard listener needed.
  const unsubscribeBehavior = behaviorManager.behaviorState.subscribe(state => {
    if (state.linkCreation === 'idle' && linkDrawController.getActiveTempLinkId()) linkDrawController.clearTempLink();
  });

  svgContainer.addEventListener('pointermove', handleCanvasMouseMove);
  svgContainer.addEventListener('pointerup',   onCanvasMouseUp);
  svgContainer.addEventListener('click',       onCanvasClick);

  return {
    handleCanvasMouseMove,
    cleanup: {
      destroy: () => {
        unsubscribeBehavior();
        svgContainer.removeEventListener('pointermove', handleCanvasMouseMove);
        svgContainer.removeEventListener('pointerup',   onCanvasMouseUp);
        svgContainer.removeEventListener('click',       onCanvasClick);
      }
    }
  };
};
