import type { EdgePosition } from '../features/edge/types/edge-position.types.js';
import { getCanvasAdapter } from './adapters/canvas-adapter.js';
import { testEdgeHit } from './create-edge-hit-tester.js';
import type { LinkDrawController } from './create-link-draw-controller.js';
import type { LinkFinalizer } from './create-link-finalizer.js';
import { computeAnchorWorldPos } from './create-link-finalizer.js';
import { registry } from './create-signal-registry.js';
import { validateTopologicalConnection } from './domain/validate-topological-connection.js';
import { ENTITY_DEFAULT_HEIGHT, ENTITY_DEFAULT_WIDTH } from './entity-defaults.js';
import { GLOBAL_KEY } from './registry-keys.js';
import type { EntityInstance } from './types/entity-instance.types.js';
import type { EntitySpawnFactory } from './types/entity-spawn-factory.types.js';
import type { GlobalConfig } from './types/global-config.types.js';
import type { InteractiveBehaviorManager } from './types/interactive-behavior-manager.types.js';
import type { Signal } from '@atomos-web/prime';
import type { WorkspaceManager } from './types/workspace-manager.types.js';
import type { WorkspaceState } from './types/workspace-state.types.js';

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
}

export const createCanvasEventHandler = function(
  svgContainer: SVGSVGElement,
  deps: CanvasEventHandlerDeps
): CanvasEventHandler {
  const {
    workspaceState, behaviorManager, linkDrawController, linkFinalizer,
    screenToSvgCoords, registerEntity, getSpawnFactory, getManager, onWorkspaceStateUpdate
  } = deps;

  const onCanvasMouseUp = (event: MouseEvent): void => {
    if (!linkDrawController.isDrawing()) return;
    const srcPos = linkDrawController.getActiveTempLinkSourcePos();
    const srcAnchorId = linkDrawController.getActiveTempSrcAnchorId();
    const srcEdge = linkDrawController.getActiveTempSrcEdge();
    const srcEntityId = linkDrawController.getActiveTempSrcEntityId();
      const optionalReconnectId = linkDrawController.consumeReconnectLinkId();
    if (!srcPos || !srcAnchorId || !srcEdge || !srcEntityId) return;

    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);

    // Spatial hit-test: find closest entity edge in zone
    let nearest: { anchorId: string; entityId: string; edge: EdgePosition; dist: number } | undefined;
    workspaceState.value.entities.forEach((entity, entityId) => {
      if (entityId === srcEntityId) return;
      (['top', 'bottom', 'left', 'right'] as EdgePosition[]).forEach(side => {
        if (!testEdgeHit(entity, side, svgCoords)) return;
        const pos = computeAnchorWorldPos(workspaceState, entityId, side);
        const dist = Math.hypot(svgCoords.x - pos.x, svgCoords.y - pos.y);
        if (!nearest || dist < nearest.dist) {
          nearest = { anchorId: `${entityId}-anchor-${side}`, entityId, edge: side, dist };
        }
      });
    });

    if (nearest) {
      linkDrawController.clearTempLink();
      linkFinalizer.finalizeLinkToAnchor(
        nearest.anchorId,
        computeAnchorWorldPos(workspaceState, nearest.entityId, nearest.edge),
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

    const spawnFactory = getSpawnFactory();
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
    if (behaviorManager.behaviorState.value.linkCreation === 'drawing') return;
    if ((event.target as Element) === svgContainer || (event.target as Element).tagName === 'svg') {
      behaviorManager.selectEntity('');
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
      if (srcEntityId) {
        let nearest: { anchorId: string; entityId: string; edge: EdgePosition; dist: number } | undefined;
        workspaceState.value.entities.forEach((entity, entityId) => {
          if (entityId === srcEntityId) return;
          (['top', 'bottom', 'left', 'right'] as EdgePosition[]).forEach(side => {
            if (!testEdgeHit(entity, side, svgCoords)) return;
            const pos = computeAnchorWorldPos(workspaceState, entityId, side);
            const dist = Math.hypot(svgCoords.x - pos.x, svgCoords.y - pos.y);
            if (!nearest || dist < nearest.dist) {
              nearest = { anchorId: `${entityId}-anchor-${side}`, entityId, edge: side, dist };
            }
          });
        });

        if (nearest) {
          const adapter = getCanvasAdapter();
          const srcEntity = adapter.getEntity(srcEntityId);
          const dstEntity = adapter.getEntity(nearest.entityId);
          
          if (srcEntity && dstEntity) {
            const allLinks = (adapter.getAllLinks?.() || []) as any[];
            const globalConfigSig = registry.get<GlobalConfig>(GLOBAL_KEY);
            const topologyRules = globalConfigSig?.value.topology;
            
            const validation = validateTopologicalConnection(
              srcEntity,
              dstEntity,
              allLinks,
              topologyRules
            );
            linkDrawController.setTempLinkValidity(validation.isValid);
          } else {
            linkDrawController.setTempLinkValidity(true);
          }
        } else {
          linkDrawController.setTempLinkValidity(true);
        }
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && linkDrawController.isDrawing()) {
      linkDrawController.clearTempLink();
      behaviorManager.cancelLinkCreation();
      onWorkspaceStateUpdate({ linkCreationInProgress: false });
    }
  };

  svgContainer.addEventListener('mousemove', handleCanvasMouseMove);
  svgContainer.addEventListener('mouseup',   onCanvasMouseUp);
  svgContainer.addEventListener('click',     onCanvasClick);
  document.addEventListener('keydown', onKeyDown);

  return {
    handleCanvasMouseMove,
    cleanup: {
      destroy: () => {
        svgContainer.removeEventListener('mousemove', handleCanvasMouseMove);
        svgContainer.removeEventListener('mouseup',   onCanvasMouseUp);
        svgContainer.removeEventListener('click',     onCanvasClick);
        document.removeEventListener('keydown', onKeyDown);
      }
    }
  };
};
