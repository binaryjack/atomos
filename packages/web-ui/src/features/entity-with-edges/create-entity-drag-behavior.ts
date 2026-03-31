import type { Signal } from '../../core/types/signal.types.js';
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js';

export interface EntityDragBehaviorResult {
  readonly cleanup: () => void;
}

export const createEntityDragBehavior = function(
  bodyElement: HTMLElement | Element,
  position: Signal<{ x: number; y: number }>,
  selected: Signal<boolean>,
  workspace: WorkspaceManager,
  entityId: string
): EntityDragBehaviorResult {
  let dragging = false;
  let didMove = false;
  let dragStart = { svgX: 0, svgY: 0, posX: 0, posY: 0 };

  const onMouseDown = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'BUTTON' || 
      target.tagName === 'SELECT' || 
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable || 
      target.closest('button') || 
      target.closest('input') ||
      target.closest('select') ||
      target.closest('.no-drag')
    )) {
      return; 
    }

    const me = e as MouseEvent;
    me.stopPropagation();
    const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
    dragging = true;
    didMove = false;
    dragStart = { svgX: svg.x, svgY: svg.y, posX: position.value.x, posY: position.value.y };
    if (bodyElement instanceof HTMLElement) bodyElement.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: Event): void => {
    if (!dragging) return;
    const me = e as MouseEvent;
    const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
    const dx = svg.x - dragStart.svgX;
    const dy = svg.y - dragStart.svgY;
    if (!didMove && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      didMove = true;
    }
    position.set({
      x: dragStart.posX + dx,
      y: dragStart.posY + dy
    });
  };

  const onMouseUp = (): void => {
    if (!dragging) return;
    dragging = false;
    if (!didMove) {
      // Pure click — select this entity
      selected.set(true);
      workspace.behaviorManager.selectEntity(entityId);
    }
    didMove = false;
    if (bodyElement instanceof HTMLElement) bodyElement.style.cursor = '';
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  // Deselect when workspace selects a different entity
  const unsubBehavior = workspace.behaviorManager.behaviorState.subscribe(() => {
    const state = workspace.behaviorManager.behaviorState.value;
    if (state.activeEntityId !== entityId && selected.value) {
      selected.set(false);
    }
  });

  bodyElement.addEventListener('mousedown', onMouseDown as EventListener);

  return {
    cleanup: () => {
      unsubBehavior();
      bodyElement.removeEventListener('mousedown', onMouseDown as EventListener);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  };
};
