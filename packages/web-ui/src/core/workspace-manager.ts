/**
 * @deprecated This implementation is incomplete and should not be used.
 * Use create-workspace-manager.ts instead which has proper:
 * - restoreLink method with isRestoration flag to prevent infinite loops
 * - Link finalizer integration for Command-Query Separation
 * - Clean architecture compatibility
 */

import type { EdgePosition } from '../features/edge/types/edge.types.js';
import { createSignal } from './create-signal.js';
import type { InteractiveBehaviorManager } from './interactive-behavior-manager.js';
import { createInteractiveBehaviorManager } from './interactive-behavior-manager.js';
import type { LinkManager } from './link-manager.js';
import { createLinkManager } from './link-manager.js';
import type { Signal } from './types/signal.types.js';

export const ENTITY_DEFAULT_WIDTH  = 200;
export const ENTITY_DEFAULT_HEIGHT = 120;

export interface EntityInstance {
  readonly id: string;
  readonly element: SVGGElement;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly cleanup: () => void;
  /** Optional: notify anchor that a link connecting through it was finalized */
  readonly notifyAnchorConnected?: (anchorId: string, linkId: string) => void;
}

export interface WorkspaceState {
  readonly entities: Map<string, EntityInstance>;
  readonly selectedEntityId?: string | undefined;
  readonly linkCreationInProgress: boolean;
  readonly cursorPosition: { x: number; y: number };
}

/** Factory called by workspace when user drops on empty canvas during link draw */
export type EntitySpawnFactory = (
  id: string,
  position: { x: number; y: number },
  workspace: WorkspaceManager
) => EntityInstance;

export interface WorkspaceManager {
  readonly workspaceState: Signal<WorkspaceState>;
  readonly behaviorManager: InteractiveBehaviorManager;
  readonly linkManager: LinkManager;
  readonly registerEntity: (entity: EntityInstance) => void;
  readonly unregisterEntity: (entityId: string) => void;
  readonly screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  readonly onLinkCreated?: (link: { id: string; sourceAnchorId: string; targetAnchorId: string; leftEntityId: string; rightEntityId: string }, isReconnect?: boolean) => void;
  readonly onEntityDeleted?: (entityId: string) => void;
  /**
   * Called by an anchor's mousedown. Begins the draw-link flow.
   * srcEdge = which side of the entity the anchor lives on.
   */
  readonly startLinkFromAnchor: (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    srcEdge: EdgePosition,
    event: MouseEvent
  ) => void;
  /**
   * Called by an anchor's mouseup while a link is being drawn.
   * Finalizes the connection to this anchor.
   */
  readonly finalizeLinkToAnchor: (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    dstEdge: EdgePosition
  ) => void;
  /** Set the factory used to spawn new entities when user drops on empty canvas */
  readonly setEntitySpawnFactory: (factory: EntitySpawnFactory) => void;
  readonly appendToCanvas: (element: SVGElement) => void;
  /** Called by edge hover during drawing to track potential destination anchor */
  readonly notifyAnchorHoverStart: (anchorId: string, entityId: string, edge: EdgePosition) => void;
  readonly notifyAnchorHoverEnd: () => void;
  readonly handleCanvasMouseMove: (event: MouseEvent) => void;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export const createWorkspaceManager = function(
  svgContainer: SVGSVGElement,
  contentRoot: SVGElement = svgContainer
): WorkspaceManager {
  const cleanupFunctions: Array<() => void> = [];

  const behaviorManager = createInteractiveBehaviorManager();
  const linkManager = createLinkManager();
  cleanupFunctions.push(behaviorManager.cleanup.destroy);
  cleanupFunctions.push(linkManager.cleanup.destroy);

  const workspaceState = createSignal<WorkspaceState>({
    entities: new Map(),
    selectedEntityId: undefined,
    linkCreationInProgress: false,
    cursorPosition: { x: 0, y: 0 }
  });

  // SVG coordinate conversion — contentRoot is the viewport <g> whose CTM includes pan+zoom
  const svgPoint = svgContainer.createSVGPoint();
  const screenToSvgCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const ctm = (contentRoot as unknown as SVGGraphicsElement).getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const t = svgPoint.matrixTransform(ctm.inverse());
    return { x: t.x, y: t.y };
  };

  // Active link draw state
  let activeTempLinkId: string | undefined;
  let activeTempLinkSourcePos: { x: number; y: number } | undefined;
  let activeTempSrcAnchorId: string | undefined;
  let activeTempSrcEntityId: string | undefined;
  let activeTempSrcEdge: EdgePosition | undefined;

  let spawnFactory: EntitySpawnFactory | undefined;
  // Which anchor the cursor is currently hovering during a link draw — used by onCanvasMouseUp
  let pendingDstAnchor: { anchorId: string; entityId: string; edge: EdgePosition } | undefined;

  // Per-link signal subscriptions — keeps bezier path in sync with entity movement
  const linkSubscriptions = new Map<string, Array<() => void>>();

  const computeAnchorWorldPos = (entityId: string, edge: EdgePosition): { x: number; y: number } => {
    const entity = workspaceState.value.entities.get(entityId);
    if (!entity) return { x: 0, y: 0 };
    const { x, y } = entity.position.value;
    const { width, height } = entity.dimensions.value;
    switch (edge) {
      case 'top':    return { x: x + width / 2, y };
      case 'bottom': return { x: x + width / 2, y: y + height };
      case 'left':   return { x,                y: y + height / 2 };
      case 'right':  return { x: x + width,     y: y + height / 2 };
    }
  };

  const clearTempLink = () => {
    if (activeTempLinkId !== undefined) {
      linkManager.removeLink(activeTempLinkId);
      activeTempLinkId = undefined;
      activeTempLinkSourcePos = undefined;
      activeTempSrcAnchorId = undefined;
      activeTempSrcEntityId = undefined;
      activeTempSrcEdge = undefined;
      pendingDstAnchor = undefined;
    }
  };

  const startLinkFromAnchor = (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    srcEdge: EdgePosition,
    event: MouseEvent
  ) => {
    clearTempLink();
    behaviorManager.startLinkCreation({ entityId, anchorId, position: anchorPos, event });

    const tempId = `temp-${Date.now()}`;
    const tempLink = linkManager.createLink({
      id: tempId,
      sourceAnchorId: anchorId,
      sourcePosition: anchorPos,
      targetPosition: anchorPos,
      sourceEdge: srcEdge,
      temporary: true,
      animated: true,
      strokeColor: '#3b82f6'
    });

    contentRoot.appendChild(tempLink.element);
    activeTempLinkId = tempId;
    activeTempLinkSourcePos = anchorPos;
    activeTempSrcAnchorId = anchorId;
    activeTempSrcEntityId = entityId;
    activeTempSrcEdge = srcEdge;

    workspaceState.set({ ...workspaceState.value, linkCreationInProgress: true });
  };

  const finalizeLinkToAnchor = (
    dstAnchorId: string,
    dstAnchorPos: { x: number; y: number },
    dstEntityId: string,
    dstEdge: EdgePosition
  ) => {
    if (!activeTempLinkSourcePos || !activeTempSrcAnchorId || !activeTempSrcEdge) return;
    // Don't connect to the same anchor
    if (dstAnchorId === activeTempSrcAnchorId) { clearTempLink(); return; }

    // Capture source entity ID early for link creation notification
    const srcEntityId = activeTempSrcEntityId ?? '';
    const srcEdge     = activeTempSrcEdge!;

    const linkId = `link-${activeTempSrcAnchorId}-${dstAnchorId}-${Date.now()}`;
    const permanentLink = linkManager.createLink({
      id: linkId,
      sourceAnchorId: activeTempSrcAnchorId,
      targetAnchorId: dstAnchorId,
      sourcePosition: activeTempLinkSourcePos,
      targetPosition: dstAnchorPos,
      sourceEdge: activeTempSrcEdge,
      targetEdge: dstEdge,
      strokeColor: '#3b82f6',
      strokeWidth: 2
    });

    contentRoot.appendChild(permanentLink.element);

    // Notify schema store about new link for persistence
    console.log('[WORKSPACE-MANAGER] Link created, checking for onLinkCreated callback...');
    if (manager.onLinkCreated) {
      console.log('[WORKSPACE-MANAGER] ✓ Calling onLinkCreated callback with:', {
        id: linkId,
        sourceAnchorId: activeTempSrcAnchorId,
        targetAnchorId: dstAnchorId,
        leftEntityId: srcEntityId,
        rightEntityId: dstEntityId,
      });
      
      manager.onLinkCreated({
        id: linkId,
        sourceAnchorId: activeTempSrcAnchorId,
        targetAnchorId: dstAnchorId,
        leftEntityId: srcEntityId,
        rightEntityId: dstEntityId,
      });
    } else {
      console.error('[WORKSPACE-MANAGER] ✗ No onLinkCreated callback set! Link will not be persisted!');
    }

    // Subscribe to entity signals so link path updates when entities move or resize
    const srcEntity   = workspaceState.value.entities.get(srcEntityId);
    const dstEntity   = workspaceState.value.entities.get(dstEntityId);
    if (srcEntity && dstEntity) {
      const recompute = () => {
        permanentLink.updatePath(
          computeAnchorWorldPos(srcEntityId, srcEdge),
          computeAnchorWorldPos(dstEntityId, dstEdge),
          srcEdge,
          dstEdge
        );
      };
      linkSubscriptions.set(linkId, [
        srcEntity.position.subscribe(recompute),
        srcEntity.dimensions.subscribe(recompute),
        dstEntity.position.subscribe(recompute),
        dstEntity.dimensions.subscribe(recompute),
      ]);
    }

    // Notify entities that their anchors are now connected
    workspaceState.value.entities.get(srcEntityId)
      ?.notifyAnchorConnected?.(activeTempSrcAnchorId!, linkId);
    workspaceState.value.entities.get(dstEntityId)
      ?.notifyAnchorConnected?.(dstAnchorId, linkId);

    clearTempLink();
    behaviorManager.cancelLinkCreation(); // workspace owns all link state; cancel resets behavior to idle
    workspaceState.set({ ...workspaceState.value, linkCreationInProgress: false });
  };

  // mouseup during drawing — spatial hit-test against all entity anchors, then spawn or cancel
  const onCanvasMouseUp = (event: MouseEvent) => {
    if (behaviorManager.behaviorState.value.linkCreation !== 'drawing') return;
    if (!activeTempLinkSourcePos || !activeTempSrcAnchorId || !activeTempSrcEdge || !activeTempSrcEntityId) return;

    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    const srcEntityId = activeTempSrcEntityId; // capture before any clearTempLink call

    // Zone test: cursor must be inside the same hit rectangle painted by create-edge.ts.
    // EDGE_HIT must equal HIT_SIZE in create-edge.ts (32). This means: if the edge strip
    // is highlighted (visible to the user), the connection WILL be made on release.
    const EDGE_HIT = 32;
    const inEdgeZone = (entity: EntityInstance, side: EdgePosition): boolean => {
      const { x, y } = entity.position.value;
      const { width, height } = entity.dimensions.value;
      const c = svgCoords;
      switch (side) {
        case 'top':    return c.x >= x && c.x <= x + width  && c.y >= y - EDGE_HIT && c.y <= y;
        case 'bottom': return c.x >= x && c.x <= x + width  && c.y >= y + height   && c.y <= y + height + EDGE_HIT;
        case 'left':   return c.y >= y && c.y <= y + height && c.x >= x - EDGE_HIT && c.x <= x;
        case 'right':  return c.y >= y && c.y <= y + height && c.x >= x + width    && c.x <= x + width + EDGE_HIT;
      }
    };

    let nearest: { anchorId: string; entityId: string; edge: EdgePosition; dist: number } | undefined;
    workspaceState.value.entities.forEach((entity, entityId) => {
      if (entityId === srcEntityId) return;
      (['top', 'bottom', 'left', 'right'] as EdgePosition[]).forEach(side => {
        if (!inEdgeZone(entity, side)) return;
        const pos = computeAnchorWorldPos(entityId, side);
        const dist = Math.hypot(svgCoords.x - pos.x, svgCoords.y - pos.y);
        if (!nearest || dist < nearest.dist) {
          nearest = { anchorId: `${entityId}-anchor-${side}`, entityId, edge: side, dist };
        }
      });
    });

    if (nearest) {
      finalizeLinkToAnchor(
        nearest.anchorId,
        computeAnchorWorldPos(nearest.entityId, nearest.edge),
        nearest.entityId,
        nearest.edge
      );
      return;
    }

    // Releasing on empty canvas → spawn new entity
    if (spawnFactory) {
      const newId = `entity-${Date.now()}`;
      const newPos = {
        x: svgCoords.x - ENTITY_DEFAULT_WIDTH / 2,
        y: svgCoords.y - ENTITY_DEFAULT_HEIGHT / 2
      };
      const newEntity = spawnFactory(newId, newPos, manager);
      registerEntity(newEntity);

      // Pick the anchor facing the source entity
      const dx = activeTempLinkSourcePos.x - svgCoords.x;
      const dy = activeTempLinkSourcePos.y - svgCoords.y;
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

      finalizeLinkToAnchor(dstAnchorId, dstAnchorPos, newId, dstEdge);
    } else {
      clearTempLink();
      behaviorManager.cancelLinkCreation();
      workspaceState.set({ ...workspaceState.value, linkCreationInProgress: false });
    }
  };

  // Click on canvas background (not during drawing) = deselect
  const onCanvasClick = (event: MouseEvent) => {
    if (behaviorManager.behaviorState.value.linkCreation === 'drawing') return;
    if ((event.target as Element) === svgContainer || (event.target as Element).tagName === 'svg') {
      behaviorManager.selectEntity('');
      workspaceState.set({ ...workspaceState.value, selectedEntityId: undefined });
    }
  };

  const handleCanvasMouseMove = (event: MouseEvent) => {
    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    workspaceState.set({ ...workspaceState.value, cursorPosition: svgCoords });

    if (behaviorManager.behaviorState.value.linkCreation === 'drawing'
        && activeTempLinkId && activeTempLinkSourcePos) {
      behaviorManager.updateLinkDrawing(svgCoords);
      const tempLink = linkManager.getLink(activeTempLinkId);
      if (tempLink) tempLink.updatePath(activeTempLinkSourcePos, svgCoords, activeTempSrcEdge);
    }
  };

  // ESC cancels link creation
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && behaviorManager.behaviorState.value.linkCreation === 'drawing') {
      clearTempLink();
      behaviorManager.cancelLinkCreation();
      workspaceState.set({ ...workspaceState.value, linkCreationInProgress: false });
    }
  };

  const registerEntity = (entity: EntityInstance) => {
    const newEntities = new Map(workspaceState.value.entities);
    newEntities.set(entity.id, entity);
    workspaceState.set({ ...workspaceState.value, entities: newEntities });
    contentRoot.appendChild(entity.element);
  };

  const unregisterEntity = (entityId: string) => {
    const entity = workspaceState.value.entities.get(entityId);
    if (!entity) return;
    if (entity.element.parentNode) entity.element.parentNode.removeChild(entity.element);
    entity.cleanup();
    const newEntities = new Map(workspaceState.value.entities);
    newEntities.delete(entityId);
    workspaceState.set({
      ...workspaceState.value,
      entities: newEntities,
      selectedEntityId: workspaceState.value.selectedEntityId === entityId
        ? undefined
        : workspaceState.value.selectedEntityId
    });

    // Notify schema store about entity deletion for persistence
    if (manager.onEntityDeleted) {
      manager.onEntityDeleted(entityId);
    }
  };

  svgContainer.addEventListener('mousemove', handleCanvasMouseMove);
  svgContainer.addEventListener('mouseup',   onCanvasMouseUp);
  svgContainer.addEventListener('click',     onCanvasClick);
  document.addEventListener('keydown', onKeyDown);
  cleanupFunctions.push(() => {
    svgContainer.removeEventListener('mousemove', handleCanvasMouseMove);
    svgContainer.removeEventListener('mouseup',   onCanvasMouseUp);
    svgContainer.removeEventListener('click',     onCanvasClick);
    document.removeEventListener('keydown', onKeyDown);
  });

  const manager: WorkspaceManager = {
    workspaceState,
    behaviorManager,
    linkManager,
    registerEntity,
    unregisterEntity,
    screenToSvgCoords,
    startLinkFromAnchor,
    finalizeLinkToAnchor,
    setEntitySpawnFactory: (factory) => { spawnFactory = factory; },
    appendToCanvas: (element) => { contentRoot.appendChild(element); },
    notifyAnchorHoverStart: (anchorId, entityId, edge) => {
      if (anchorId === activeTempSrcAnchorId) return; // ignore source anchor
      pendingDstAnchor = { anchorId, entityId, edge };
    },
    notifyAnchorHoverEnd: () => { pendingDstAnchor = undefined; },
    handleCanvasMouseMove,
    cleanup: {
      destroy: () => {
        linkSubscriptions.forEach(unsubs => unsubs.forEach(fn => fn()));
        linkSubscriptions.clear();
        workspaceState.value.entities.forEach(e => e.cleanup());
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };

  return manager;
};
