import type { Signal } from '@atomos-web/prime'
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js'
import { calculateSnappedPosition } from '../alignment/create-alignment-guides.js'

export interface EntityDragBehaviorResult {
  readonly cleanup: () => void;
}

export const createEntityDragBehavior = function(
  bodyElement: HTMLElement | Element,
  position: Signal<{ x: number; y: number }>,
  selected: Signal<boolean>,
  workspace: WorkspaceManager,
  entityId: string,
  dimensions: Signal<{ width: number; height: number }>
): EntityDragBehaviorResult {
  let dragging = false;
  let didMove = false;
  let dragStart = { svgX: 0, svgY: 0, posX: 0, posY: 0 };
  let queuedFrame: number | null = null;

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
      console.log('[DRAG-BEHAVIOR] Started dragging entity:', entityId);
    }

    if (queuedFrame !== null) {
      cancelAnimationFrame(queuedFrame);
    }
    
    queuedFrame = requestAnimationFrame(() => {
      queuedFrame = null;

      // Calculate raw position
      let rawX = dragStart.posX + dx;
      let rawY = dragStart.posY + dy;

      // Get current dimensions for alignment guides
      const currentDims = dimensions.value;
      console.log('[DRAG-BEHAVIOR] Current dimensions:', currentDims);

      // Calculate and show alignment guides
      const guides = workspace.updateAlignmentGuides(entityId, { x: rawX, y: rawY }, currentDims);

      // Check if we should snap to alignment guides
      if (guides.length > 0) {
        const snappedPos = calculateSnappedPosition(
          { x: rawX, y: rawY },
          currentDims,
          guides
        );
        rawX = snappedPos.x;
        rawY = snappedPos.y;
      } else {
        // Grid snapping only when no alignment guides are active
        const root = document.querySelector('.vbs-workspace, vbs-workspace') as HTMLElement || document.body;
        let gridSize = 16;
        if (root) {
          const gridVar = getComputedStyle(root).getPropertyValue('--vbs-grid-size');
          const parsed = parseInt(gridVar);
          if (!isNaN(parsed) && parsed > 0) gridSize = parsed;
        }

        rawX = Math.round(rawX / gridSize) * gridSize;
        rawY = Math.round(rawY / gridSize) * gridSize;
      }

      position.set({ x: rawX, y: rawY });
    });
  };

  const onMouseUp = (): void => {
    if (!dragging) return;
    dragging = false;
    if (queuedFrame !== null) {
      cancelAnimationFrame(queuedFrame);
      queuedFrame = null;
    }
    
    // Clear alignment guides
    workspace.clearAlignmentGuides();
    
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
