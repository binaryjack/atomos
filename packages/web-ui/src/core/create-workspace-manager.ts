import { createCanvasEventHandler } from './create-canvas-event-handler.js';
import { createCoordinateTransformer } from './create-coordinate-transformer.js';
import { createEntityRegistry } from './create-entity-registry.js';
import { createLinkDrawController } from './create-link-draw-controller.js';
import { createLinkFinalizer } from './create-link-finalizer.js';
import { createInteractiveBehaviorManager } from './interactive-behavior-manager.js';
import { createLinkManager } from './link-manager.js';
import type { EntitySpawnFactory } from './types/entity-spawn-factory.types.js';
import type { WorkspaceManager } from './types/workspace-manager.types.js';
import type { WorkspaceState } from './types/workspace-state.types.js';

export const createWorkspaceManager = function(
  svgContainer: SVGSVGElement,
  contentRoot: SVGElement = svgContainer
): WorkspaceManager {
  const behaviorManager  = createInteractiveBehaviorManager();
  const linkManager      = createLinkManager();
  const transformer      = createCoordinateTransformer(svgContainer, contentRoot);
  const registry         = createEntityRegistry(contentRoot);
  const linkFinalizer    = createLinkFinalizer(linkManager, registry.workspaceState, contentRoot, (link, isReconnect) => {
    // Forward to workspace manager's onLinkCreated callback if set
    console.log('[WORKSPACE-MANAGER] Link created via finalizer:', link, { isReconnect });
    (manager as any).onLinkCreated?.(link, isReconnect);
  }, (linkId) => {
    // Forward to workspace manager's onLinkDeleted callback if set
    console.log('[WORKSPACE-MANAGER] Link deleted via finalizer:', linkId);
    (manager as any).onLinkDeleted?.(linkId);
  });
  const linkDrawCtrl     = createLinkDrawController(linkManager, behaviorManager, contentRoot, linkFinalizer);

  let spawnFactory: EntitySpawnFactory | undefined;

  const patchState = (patch: Partial<WorkspaceState>): void => {
    registry.workspaceState.set({ ...registry.workspaceState.value, ...patch });
  };

  // Late binding: manager isn't constructed until after this arrow closes over it
  let manager: WorkspaceManager;

  const canvasEvents = createCanvasEventHandler(svgContainer, {
    workspaceState:    registry.workspaceState,
    behaviorManager,
    linkDrawController: linkDrawCtrl,
    linkFinalizer,
    screenToSvgCoords: transformer.screenToSvgCoords,
    registerEntity:    registry.registerEntity,
    getSpawnFactory:   () => spawnFactory,
    getManager:        () => manager,
    onWorkspaceStateUpdate: patchState,
  });

  manager = {
    workspaceState:    registry.workspaceState,
    behaviorManager,
    linkManager,

    registerEntity:    registry.registerEntity,
    unregisterEntity:  (entityId: string) => {
      linkFinalizer.removeLinksForEntity(entityId);
      registry.unregisterEntity(entityId);
      // Notify deletion callback for Redux store cleanup
      if ((manager as any).onEntityDeleted) {
        (manager as any).onEntityDeleted(entityId);
      }
    },
    screenToSvgCoords: transformer.screenToSvgCoords,

    startLinkFromAnchor: (anchorId, anchorPos, entityId, srcEdge, event) => {
      linkDrawCtrl.startLinkFromAnchor(anchorId, anchorPos, entityId, srcEdge, event);
      patchState({ linkCreationInProgress: true });
    },

    finalizeLinkToAnchor: (dstAnchorId, dstAnchorPos, dstEntityId, dstEdge) => {
      const srcAnchorId = linkDrawCtrl.getActiveTempSrcAnchorId();
      const srcEntityId = linkDrawCtrl.getActiveTempSrcEntityId();
      const srcEdge     = linkDrawCtrl.getActiveTempSrcEdge();
      const srcPos      = linkDrawCtrl.getActiveTempLinkSourcePos();
      const optionalReconnectId = linkDrawCtrl.consumeReconnectLinkId();
      if (!srcAnchorId || !srcEntityId || !srcEdge || !srcPos) return;
      if (dstAnchorId === srcAnchorId) { linkDrawCtrl.clearTempLink(); return; }
      linkDrawCtrl.clearTempLink();
      linkFinalizer.finalizeLinkToAnchor(
        dstAnchorId, dstAnchorPos, dstEntityId, dstEdge,
        srcAnchorId, srcEntityId, srcEdge, srcPos,
        false,
        optionalReconnectId
      );
      behaviorManager.cancelLinkCreation();
      patchState({ linkCreationInProgress: false });
    },

    setEntitySpawnFactory: (factory) => { spawnFactory = factory; },
    appendToCanvas:        (element) => { contentRoot.appendChild(element); },

    restoreLink: (linkId, srcAnchorId, srcPos, srcEntityId, srcEdge, dstAnchorId, dstPos, dstEntityId, dstEdge) => {
      // Restore a persisted link using the internal link finalizer
      // Pass isRestoration=true to prevent triggering persistence callbacks
      linkFinalizer.finalizeLinkToAnchor(
        dstAnchorId, dstPos, dstEntityId, dstEdge,
        srcAnchorId, srcEntityId, srcEdge, srcPos,
        true, // isRestoration flag
        linkId // original linkId
      );
    },

    notifyAnchorHoverStart: () => { /* handled via testEdgeHit in canvas event handler */ },
    notifyAnchorHoverEnd:   () => { /* no-op */ },

    handleCanvasMouseMove: canvasEvents.handleCanvasMouseMove,

    cleanup: {
      destroy: () => {
        canvasEvents.cleanup.destroy();
        linkFinalizer.cleanup.destroy();
        behaviorManager.cleanup.destroy();
        linkManager.cleanup.destroy();
        registry.workspaceState.value.entities.forEach(e => e.cleanup());
      }
    }
  };

  return manager;
};
