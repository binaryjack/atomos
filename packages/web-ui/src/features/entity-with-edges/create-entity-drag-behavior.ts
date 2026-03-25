import type { Signal } from '../../core/types/signal.types.js';
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js';

export interface EntityDragBehaviorResult {
  readonly cleanup: () => void;
}

export const createEntityDragBehavior = function(
  bodyElement: Element,
  position: Signal<{ x: number; y: number }>,
  selected: Signal<boolean>,
  workspace: WorkspaceManager
): EntityDragBehaviorResult {
  let dragging = false;
  let dragStart = { svgX: 0, svgY: 0, posX: 0, posY: 0 };

  const onMouseDown = (e: Event): void => {
    const me = e as MouseEvent;
    me.stopPropagation();
    selected.set(true);
    const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
    dragging = true;
    dragStart = { svgX: svg.x, svgY: svg.y, posX: position.value.x, posY: position.value.y };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: Event): void => {
    if (!dragging) return;
    const me = e as MouseEvent;
    const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
    position.set({
      x: dragStart.posX + (svg.x - dragStart.svgX),
      y: dragStart.posY + (svg.y - dragStart.svgY)
    });
  };

  const onMouseUp = (): void => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  bodyElement.addEventListener('mousedown', onMouseDown as EventListener);

  return {
    cleanup: () => {
      bodyElement.removeEventListener('mousedown', onMouseDown as EventListener);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
  };
};
