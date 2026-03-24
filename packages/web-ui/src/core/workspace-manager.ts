import { createSignal } from './create-signal.js';
import { createInteractiveBehaviorManager } from './interactive-behavior-manager.js';
import { createLinkManager } from './link-manager.js';
import type { InteractiveBehaviorManager, InteractionContext } from './interactive-behavior-manager.js';
import type { LinkManager } from './link-manager.js';
import type { Signal } from './types/signal.types.js';

export interface EntityInstance {
  readonly id: string;
  readonly element: SVGGElement;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly cleanup: () => void;
}

export interface WorkspaceState {
  readonly entities: Map<string, EntityInstance>;
  readonly selectedEntityId?: string | undefined;
  readonly linkCreationInProgress: boolean;
  readonly cursorPosition: { x: number; y: number };
}

export interface WorkspaceManager {
  readonly workspaceState: Signal<WorkspaceState>;
  readonly behaviorManager: InteractiveBehaviorManager;
  readonly linkManager: LinkManager;
  readonly registerEntity: (entity: EntityInstance) => void;
  readonly unregisterEntity: (entityId: string) => void;
  readonly screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
  readonly startLinkFromAnchor: (anchorId: string, anchorPos: { x: number; y: number }, entityId: string, event: MouseEvent) => void;
  readonly appendToCanvas: (element: SVGElement) => void;
  readonly handleCanvasClick: (event: MouseEvent) => void;
  readonly handleCanvasMouseMove: (event: MouseEvent) => void;
  readonly createEntityAtCursor: (entityType: string) => string;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}

export const createWorkspaceManager = function(svgContainer: SVGSVGElement): WorkspaceManager {
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

  // SVG coordinate conversion - converts screen (client) pixels to SVG viewport units
  const svgPoint = svgContainer.createSVGPoint();
  const screenToSvgCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    svgPoint.x = clientX;
    svgPoint.y = clientY;
    const ctm = svgContainer.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const transformed = svgPoint.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  // Active temp link tracking (one at a time)
  let activeTempLinkId: string | undefined;
  let activeTempLinkSourcePos: { x: number; y: number } | undefined;

  const clearTempLink = () => {
    if (activeTempLinkId !== undefined) {
      linkManager.removeLink(activeTempLinkId);
      activeTempLinkId = undefined;
      activeTempLinkSourcePos = undefined;
    }
  };

  // Called by entity anchor mousedown - single entry point for link creation
  const startLinkFromAnchor = (anchorId: string, anchorPos: { x: number; y: number }, entityId: string, event: MouseEvent) => {
    clearTempLink();

    behaviorManager.startLinkCreation({ entityId, anchorId, position: anchorPos, event });

    const tempId = `temp-${Date.now()}`;
    const tempLink = linkManager.createLink({
      id: tempId,
      sourceAnchorId: anchorId,
      sourcePosition: anchorPos,
      targetPosition: anchorPos,
      temporary: true,
      animated: true,
      strokeColor: '#3b82f6'
    });

    svgContainer.appendChild(tempLink.element);
    activeTempLinkId = tempId;
    activeTempLinkSourcePos = anchorPos;

    workspaceState.set({ ...workspaceState.value, linkCreationInProgress: true });
  };

  const registerEntity = (entity: EntityInstance) => {
    const newEntities = new Map(workspaceState.value.entities);
    newEntities.set(entity.id, entity);
    workspaceState.set({ ...workspaceState.value, entities: newEntities });
    svgContainer.appendChild(entity.element);
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
  };

  const handleCanvasClick = (event: MouseEvent) => {
    const state = behaviorManager.behaviorState.value;
    if (state.linkCreation === 'drawing') {
      behaviorManager.cancelLinkCreation();
    } else {
      behaviorManager.selectEntity('');
      workspaceState.set({ ...workspaceState.value, selectedEntityId: undefined });
    }
  };

  const handleCanvasMouseMove = (event: MouseEvent) => {
    const svgCoords = screenToSvgCoords(event.clientX, event.clientY);
    workspaceState.set({ ...workspaceState.value, cursorPosition: svgCoords });

    const state = behaviorManager.behaviorState.value;
    if (state.linkCreation === 'drawing' && activeTempLinkId && activeTempLinkSourcePos) {
      behaviorManager.updateLinkDrawing(svgCoords);
      const tempLink = linkManager.getLink(activeTempLinkId);
      if (tempLink) tempLink.updatePath(activeTempLinkSourcePos, svgCoords);
    }
  };

  // Cancel temp link when link creation state returns to idle
  cleanupFunctions.push(
    behaviorManager.behaviorState.subscribe((state) => {
      if (state.linkCreation === 'idle') {
        clearTempLink();
        workspaceState.set({ ...workspaceState.value, linkCreationInProgress: false });
      }
    })
  );

  const createEntityAtCursor = (entityType: string): string => {
    const pos = workspaceState.value.cursorPosition;
    const id = `entity-${Date.now()}`;
    console.log(`createEntityAtCursor: ${entityType} at`, pos, id);
    return id;
  };

  svgContainer.addEventListener('click', handleCanvasClick);
  svgContainer.addEventListener('mousemove', handleCanvasMouseMove);
  cleanupFunctions.push(() => {
    svgContainer.removeEventListener('click', handleCanvasClick);
    svgContainer.removeEventListener('mousemove', handleCanvasMouseMove);
  });

  return {
    workspaceState,
    behaviorManager,
    linkManager,
    registerEntity,
    unregisterEntity,
    screenToSvgCoords,
    startLinkFromAnchor,
    appendToCanvas: (element: SVGElement) => { svgContainer.appendChild(element); },
    handleCanvasClick,
    handleCanvasMouseMove,
    createEntityAtCursor,
    cleanup: {
      destroy: () => {
        workspaceState.value.entities.forEach(e => e.cleanup());
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};