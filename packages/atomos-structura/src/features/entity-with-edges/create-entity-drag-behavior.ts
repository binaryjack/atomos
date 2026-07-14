import type { Signal } from '@atomos-web/prime'
import type { WorkspaceManager } from '../../core/types/workspace-manager.types.js'
import { calculateSnappedPosition } from '../alignment/create-alignment-guides.js'
import { getGeneralSettings } from '../../core/adapters/toolbox-config-manager.js'
import { autoRouteLinks } from '../../core/application/dag-service.js'
import { getEntityManager } from '../../core/presentation/entity-manager.js'

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

  let activeGridSize = 16;

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
    
    // Start coordinate caching to eliminate getScreenCTM layout thrashing during mousemove
    if (workspace.startCachingCoords) {
      workspace.startCachingCoords();
    }

    const svg = workspace.screenToSvgCoords(me.clientX, me.clientY);
    dragging = true;
    didMove = false;
    dragStart = { svgX: svg.x, svgY: svg.y, posX: position.value.x, posY: position.value.y };
    
    // Cache grid size at drag start to prevent layout thrashing (getComputedStyle) in onMouseMove
    activeGridSize = 16;
    const root = document.querySelector('.vbs-workspace, vbs-workspace') as HTMLElement || document.body;
    if (root) {
      const gridVar = getComputedStyle(root).getPropertyValue('--vbs-grid-size');
      const parsed = parseInt(gridVar);
      if (!isNaN(parsed) && parsed > 0) activeGridSize = parsed;
    }

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
      const entityRoot = bodyElement.closest('.vbs-entity');
      if (entityRoot) {
        entityRoot.classList.add('vbs-dragging');
      }
    }

    // Calculate raw position smoothly (no snapping during drag)
    const rawX = dragStart.posX + dx;
    const rawY = dragStart.posY + dy;

    // Show alignment guides as visual aid, but do NOT snap during drag
    const currentDims = dimensions.value;
    workspace.updateAlignmentGuides(entityId, { x: rawX, y: rawY }, currentDims);

    position.set({ x: rawX, y: rawY });
  };

  const onMouseUp = (): void => {
    if (!dragging) return;
    dragging = false;
    
    // Stop coordinate caching
    if (workspace.stopCachingCoords) {
      workspace.stopCachingCoords();
    }
    
    // Clear alignment guides
    workspace.clearAlignmentGuides();
    
    const entityRoot = bodyElement.closest('.vbs-entity');
    if (entityRoot) {
      entityRoot.classList.remove('vbs-dragging');
    }
    
    if (didMove) {
      // Snap to grid/alignment on drop
      let finalX = position.value.x;
      let finalY = position.value.y;
      const currentDims = dimensions.value;

      // 1. Snap to alignment guides if nearby at drop time
      const guides = workspace.updateAlignmentGuides(entityId, { x: finalX, y: finalY }, currentDims);
      if (guides.length > 0) {
        const snappedPos = calculateSnappedPosition(
          { x: finalX, y: finalY },
          currentDims,
          guides
        );
        finalX = snappedPos.x;
        finalY = snappedPos.y;
      } else {
        // 2. Fall back to grid snapping on drop time
        const { enableSnapping } = getGeneralSettings() || {};
        if (enableSnapping) {
          finalX = Math.round(finalX / activeGridSize) * activeGridSize;
          finalY = Math.round(finalY / activeGridSize) * activeGridSize;
        }
      }
      
      position.set({ x: finalX, y: finalY });
      workspace.clearAlignmentGuides();

      // Write the final position directly to EntityManager to bypass 100ms debounce race condition
      const em = getEntityManager(workspace.instanceId);
      em.moveEntity(entityId, { x: finalX, y: finalY });

      // Auto-optimize connections on drop if enabled and snap is active
      const settings = getGeneralSettings();
      if (settings && settings.enableSnapping && settings.autoOptimizeConnections !== false) {
        autoRouteLinks(em);
      }
    } else {
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
