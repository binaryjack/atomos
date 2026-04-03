import type { EdgePosition } from '../features/edge/types/edge-position.types.js';
import type { LinkFinalizer } from './create-link-finalizer.js';
import type { InteractiveBehaviorManager } from './types/interactive-behavior-manager.types.js';
import type { LinkManager } from './types/link-manager.types.js';

export interface LinkDrawController {
  readonly startLinkFromAnchor: (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    srcEdge: EdgePosition,
    event: MouseEvent
  ) => void;
  readonly clearTempLink: () => void;
  readonly updateTempLink: (svgCoords: { x: number; y: number }) => void;
  readonly setTempLinkValidity: (isValid: boolean) => void;
  readonly isDrawing: () => boolean;
  readonly getActiveTempLinkId: () => string | undefined;
  readonly getActiveTempLinkSourcePos: () => { x: number; y: number } | undefined;
  readonly getActiveTempSrcAnchorId: () => string | undefined;
  readonly getActiveTempSrcEntityId: () => string | undefined;
  readonly getActiveTempSrcEdge: () => EdgePosition | undefined;
  readonly isReconnecting: () => boolean;
  readonly getReconnectLinkId: () => string | undefined;
  readonly consumeReconnectLinkId: () => string | undefined;
}

export const createLinkDrawController = function(
  linkManager: LinkManager,
  behaviorManager: InteractiveBehaviorManager,
  contentRoot: SVGElement,
  linkFinalizer?: LinkFinalizer
): LinkDrawController {
  let activeTempLinkId: string | undefined;
  let activeTempLinkSourcePos: { x: number; y: number } | undefined;
  let activeTempSrcAnchorId: string | undefined;
  let activeTempSrcEntityId: string | undefined;
  let activeTempSrcEdge: EdgePosition | undefined;

  // ── Reconnect state ─────────────────────────────────────────────────────────
  let reconnectLinkId: string | undefined;
  let reconnectMode = false;

  const clearTempLink = (): void => {
    if (activeTempLinkId !== undefined) {
      linkManager.removeLink(activeTempLinkId);
      activeTempLinkId = undefined;
      activeTempLinkSourcePos = undefined;
      activeTempSrcAnchorId = undefined;
      activeTempSrcEntityId = undefined;
      activeTempSrcEdge = undefined;
    }
    reconnectMode = false;
    // reconnectLinkId intentionally NOT cleared — callers read it after clearTempLink
  };

  const startLinkFromAnchor = (
    anchorId: string,
    anchorPos: { x: number; y: number },
    entityId: string,
    srcEdge: EdgePosition,
    event: MouseEvent
  ): void => {
    // ── Reconnect check: is there a permanent link whose TARGET is this anchor? ──
    let pendingReconnectId: string | undefined;
    linkManager.links.value.forEach((lr, id) => {
      if (lr.targetAnchorId === anchorId) pendingReconnectId = id;
    });

    clearTempLink();

    if (pendingReconnectId && linkFinalizer) {
      // Fully remove the old link (path + label FO + subscriptions)
      // but bypass Redux to retain properties
      linkFinalizer.removeLinkById(pendingReconnectId, true);
      reconnectLinkId = pendingReconnectId;
      reconnectMode = true;
    } else {
      reconnectLinkId = undefined;
      reconnectMode = false;
    }

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
      strokeColor: reconnectMode ? '#a78bfa' : '#3b82f6'
    });

    contentRoot.appendChild(tempLink.element);
    activeTempLinkId = tempId;
    activeTempLinkSourcePos = anchorPos;
    activeTempSrcAnchorId = anchorId;
    activeTempSrcEntityId = entityId;
    activeTempSrcEdge = srcEdge;
  };

  const updateTempLink = (svgCoords: { x: number; y: number }): void => {
    if (!activeTempLinkId || !activeTempLinkSourcePos) return;
    const tempLink = linkManager.getLink(activeTempLinkId);
    if (tempLink) tempLink.updatePath(activeTempLinkSourcePos, svgCoords, activeTempSrcEdge);
  };

  const setTempLinkValidity = (isValid: boolean): void => {
    if (!activeTempLinkId) return;
    const tempLink = linkManager.getLink(activeTempLinkId);
    if (tempLink) tempLink.setValidity(isValid);
  };

  const isDrawing = (): boolean =>
    behaviorManager.behaviorState.value.linkCreation === 'drawing';

  const isReconnecting = (): boolean => reconnectMode;

  const getReconnectLinkId = (): string | undefined => reconnectLinkId;

  /** Returns reconnectLinkId then clears it — used by canvas event handler after finalizing. */
  const consumeReconnectLinkId = (): string | undefined => {
    const id = reconnectLinkId;
    reconnectLinkId = undefined;
    reconnectMode = false;
    return id;
  };

  return {
    startLinkFromAnchor,
    clearTempLink,
    updateTempLink,
    setTempLinkValidity,
    isDrawing,
    isReconnecting,
    getReconnectLinkId,
    consumeReconnectLinkId,
    getActiveTempLinkId: () => activeTempLinkId,
    getActiveTempLinkSourcePos: () => activeTempLinkSourcePos,
    getActiveTempSrcAnchorId: () => activeTempSrcAnchorId,
    getActiveTempSrcEntityId: () => activeTempSrcEntityId,
    getActiveTempSrcEdge: () => activeTempSrcEdge,
  };
};
