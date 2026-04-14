import { createSignal } from '@atomos-web/prime'
import type { EntityInstance } from '../../core/types/entity-instance.types.js'
import { createEdge } from '../edge/create-edge.js'
import type { EdgePosition } from '../edge/types/edge-position.types.js'
import { createEntitySettingsModal } from '../modal/create-entity-settings-modal.js'
import { createCompactEntityContent } from './create-compact-entity-content.js'
import { createEntityContent } from './create-entity-content.js'
import { createEntityDragBehavior } from './create-entity-drag-behavior.js'
import { createEntityResizeHandles } from './create-entity-resize-handles.js'
import { createEntitySelectionRing } from './create-entity-selection-ring.js'
import type { DemoEntityProps, DemoEntityResult } from './types/demo-entity.types.js'

const EDGE_THICKNESS = 3 as const;

export const createDemoEntity = function(props: DemoEntityProps): DemoEntityResult {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  root.dataset.entityId = props.id;
  const cleanups: Array<() => void> = [];
  const edgeElements: SVGGElement[] = [];

  const selected = createSignal(false);

  // --- Entity appearance (Rectangle table vs Compact Shape) ---
  let contentElement: SVGElement | null = null;
  let dragHandleElement: HTMLElement | SVGElement | null = null;
  let updateSize: ((w: number, h: number) => void) | null = null;
  let contentCleanup: (() => void) | null = null;
  let currentShape = props.shape;
  let currentColor = props.color;

  // We need to re-bind drag behavior if content changes
  let dragCleanup: (() => void) | null = null;

  // --- Geometry sync ---
  // Create visual dimensions FIRST before buildContent, so drag behavior can use it
  const _visualDimensions = createSignal<{width: number, height: number}>(props.dimensions.value);
  
  // Create a proxy signal that reads from _visualDimensions but writes width back to props.dimensions
  const visualDimensions = {
    get value() { return _visualDimensions.value; },
    set: (v: {width: number, height: number}) => {
      // Allow width resizes to pass through to domain, but lock height if collapsed
      if (props.entityStore.signal.value.collapsed) {
         props.dimensions.set({ width: v.width, height: props.dimensions.value.height });
      } else {
         props.dimensions.set(v);
      }
    },
    subscribe: _visualDimensions.subscribe
  };

  // Sync logical dimensions to visual dimensions considering collapse state
  const updateVisualDimensions = () => {
    const isCollapsed = props.entityStore.signal.value.collapsed;
    const { width, height } = props.dimensions.value;
    _visualDimensions.set({
      width,
      height: isCollapsed ? 36 : height
    });
  };
  
  // Call immediately on initialization to handle pre-collapsed entities
  updateVisualDimensions();
  
  cleanups.push(props.dimensions.subscribe(updateVisualDimensions));
  cleanups.push(props.entityStore.signal.subscribe(updateVisualDimensions));

  const buildContent = (shape?: string, color?: string) => {
    if (contentCleanup) {
      contentCleanup();
    }
    if (contentElement && contentElement.parentNode) {
      contentElement.parentNode.removeChild(contentElement);
    }
    if (dragCleanup) {
      dragCleanup();
    }

    if (shape === 'box' || shape === 'rectangle' || !shape) {   
      const content = createEntityContent({
        entityStore: props.entityStore,
        globalConfig: props.globalConfig,
        storageProvider: props.storageProvider,
        color: color,
        onDelete: () => props.workspace.unregisterEntity(props.id),
        onSettingsClick: () => {
          const modal = createEntitySettingsModal(props.id);
          document.body.appendChild(modal);
          modal.open().catch((err: any) => console.error(err));
        },
        // Only grow height — never shrink below the user's manually-resized value.
        // Without this guard, recalcHeight() fires on every render and overwrites
        // the persisted height with the content minimum (e.g. 126), discarding the
        // user's resize on every page load.
        onHeightChange: (h) => {
          // While collapsed, logical dimensions remain untouched in storage.
          if (!props.entityStore.signal.value.collapsed) {
             if (h > props.dimensions.value.height) {
               props.dimensions.set({ width: props.dimensions.value.width, height: h });
             }
          }
        },
      });
      contentElement = content.foreignObject;
      dragHandleElement = content.dragHandle;
      updateSize = content.updateSize;
      contentCleanup = content.cleanup.destroy;
    } else {
      // For compact shapes (cylinder, actor, document, note)
      const content = createCompactEntityContent({
        shape: shape as any,
        color: color,
        entitySignal: props.entityStore.signal,
        onDelete: () => props.workspace.unregisterEntity(props.id),
        onDoubleClick: () => {
          // Import dynamic to avoid circular bounds if any, but regular import is fine
          import('./create-entity-drawer.js').then(({ createEntityDrawer }) => {
            const rect = content.rootElement.getBoundingClientRect();
            
            createEntityDrawer(props.id, rect, {
              entityStore: props.entityStore,
              globalConfig: props.globalConfig,
              storageProvider: props.storageProvider,
              color: color,
              onDelete: () => props.workspace.unregisterEntity(props.id),
              onSettingsClick: () => {
                const modal = createEntitySettingsModal(props.id);
                document.body.appendChild(modal);
                modal.open().catch((err: any) => console.error(err));
              },
              onHeightChange: (h) => {
                // Ignore height change constraints inside the floating drawer
              }
            });
          });
        }
      });
      contentElement = content.rootElement;
      dragHandleElement = content.dragHandle;
      updateSize = content.updateSize;
      contentCleanup = content.cleanup.destroy;
    }

    // Prepend so it goes behind selection rings and resize handles
    if (root.firstChild) {
      root.insertBefore(contentElement, root.firstChild);
    } else {
      root.appendChild(contentElement);
    }

    // Reattach drag behavior to new handles
    const drag = createEntityDragBehavior(dragHandleElement, props.position, selected, props.workspace, props.id, visualDimensions);
    dragCleanup = drag.cleanup;

    // Note: Don't call updateSize here - let syncGeometry() handle it with proper visual dimensions
  };

  buildContent(currentShape, currentColor);

  cleanups.push(() => {
    if (contentCleanup) contentCleanup();
    if (dragCleanup) dragCleanup();
  });

  const syncGeometry = (): void => {
    const { x, y } = props.position.value;
    const { width, height } = visualDimensions.value;
    root.setAttribute('transform', `translate(${x},${y})`);
    if (updateSize) updateSize(width, height);
    resizeHandles.syncHandles(width, height, selected.value);
    selectionRing.syncRing(width, height, selected.value);
  };

  // --- Selection ring ---
  const selectionRing = createEntitySelectionRing(selected, visualDimensions);
  root.appendChild(selectionRing.ring);
  cleanups.push(selectionRing.cleanup);

  // --- Resize handles ---
  const resizeHandles = createEntityResizeHandles(
    props.position, visualDimensions, selected, props.workspace, props.shape
  );
  resizeHandles.handles.forEach(h => root.appendChild(h));
  cleanups.push(resizeHandles.cleanup);

  // Wire geometry sync after sub-factories are constructed
  cleanups.push(props.position.subscribe(syncGeometry));
  cleanups.push(visualDimensions.subscribe(syncGeometry));
  cleanups.push(selected.subscribe(syncGeometry));

  // --- Edges ---
  const anchorIds: Record<EdgePosition, string> = {
    top:    `${props.id}-anchor-top`,
    bottom: `${props.id}-anchor-bottom`,
    left:   `${props.id}-anchor-left`,
    right:  `${props.id}-anchor-right`,
  };

  (['top', 'bottom', 'left', 'right'] as EdgePosition[]).forEach(side => {
    const edge = createEdge({
      position: side,
      entityId: props.id,
      shape: props.shape as any,
      entityPosition: props.position,
      entityDimensions: visualDimensions,
      thickness: EDGE_THICKNESS,
      anchorId: anchorIds[side],
      onHover: (hovered) => {
        if (hovered) props.workspace.notifyAnchorHoverStart(anchorIds[side], props.id, side);
        else props.workspace.notifyAnchorHoverEnd();
      },
      onAnchorMouseDown: (event, anchorId) => {
        props.workspace.startLinkFromAnchor(anchorId, edge.getAnchorPosition(), props.id, side, event);
      },
      onAnchorMouseUp: (_event, anchorId) => {
        props.workspace.finalizeLinkToAnchor(anchorId, edge.getAnchorPosition(), props.id, side);
      }
    });

    edgeElements.push(edge.element);
    cleanups.push(() => {
      edge.cleanup.destroy();
      if (edge.element.parentNode) edge.element.parentNode.removeChild(edge.element);
    });
  });

  // --- Drag behavior handles internally attached inside buildContent ---

  cleanups.push(() => {
    if (contentCleanup) contentCleanup();
    if (dragCleanup) dragCleanup();
  });

  // Initial render
  syncGeometry();

  const instance: EntityInstance = {
    id: props.id,
    element: root,
    position: props.position,
    dimensions: visualDimensions,
    cleanup: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; },
    notifyAnchorConnected: (_anchorId, _linkId) => { /* visual state: TODO */ },
    updateMetadata: (metadata) => {
      let needsRebuild = false;
      if (metadata.shape !== undefined && metadata.shape !== currentShape) {
        currentShape = metadata.shape;
        needsRebuild = true;
      }
      if (metadata.color !== undefined && metadata.color !== currentColor) {
        currentColor = metadata.color;
        needsRebuild = true;
      }
      if (needsRebuild) {
        // Rebuild the SVG view dynamically only if appearance drastically changes
        buildContent(currentShape, currentColor);
        syncGeometry(); // Re-apply correct dimensions after rebuild
      }
    }
  };

  return {
    element: root,
    edgeElements,
    instance,
    cleanup: () => instance.cleanup()
  };
};
