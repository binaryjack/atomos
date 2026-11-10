import { createSignal } from '@atomos-web/prime'
import type { EntityInstance } from '../../shared/core/types/entity-instance.types.js'
import { createEntityConnectors } from './create-entity-connectors.js'
import { createEntityDragBehavior } from './create-entity-drag-behavior.js'
import { createNodeBody } from './create-node-body.js'
import { createEntityResizeHandles } from './create-entity-resize-handles.js'
import { createEntitySelectionRing } from './create-entity-selection-ring.js'
import type { DemoEntityProps, DemoEntityResult } from './types/demo-entity.types.js'

export const createDemoEntity = function(props: DemoEntityProps): DemoEntityResult {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  root.dataset.entityId = props.id;
  root.classList.add('vbs-entity');
  // Accessibility: every node is keyboard-focusable and announced by name.
  root.setAttribute('tabindex', '0');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', `${props.name ?? props.id} node`);
  const cleanups: Array<() => void> = [];
  const edgeElements: SVGGElement[] = [];

  const selected = createSignal(false);

  // Sync color from Redux into a CSS variable on the root node
  const updateRootColor = () => {
    const color = props.color || 'var(--vbs-bg-panel, #111111)';
    root.style.setProperty('--vbs-entity-color', color);
  };
  updateRootColor();
  cleanups.push(props.entityStore.signal.subscribe(updateRootColor));

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
  
  if (props.dimensions?.subscribe) cleanups.push(props.dimensions.subscribe(updateVisualDimensions));
  if (props.entityStore?.signal?.subscribe) cleanups.push(props.entityStore.signal.subscribe(updateVisualDimensions));

  const buildContent = (shape?: string, color?: string) => {
    contentCleanup?.();
    contentElement?.remove();
    dragCleanup?.();

    // Custom node-type renderer, ER table (box/rectangle) or compact shape
    const body = createNodeBody(props, shape, color, visualDimensions.value);
    contentElement = body.rootElement;
    dragHandleElement = body.dragHandle;
    updateSize = body.updateSize;
    contentCleanup = body.cleanup.destroy;

    // Prepend so it goes behind selection rings and resize handles
    if (contentElement) {
      if (root.firstChild) {
        root.insertBefore(contentElement, root.firstChild);
      } else {
        root.appendChild(contentElement);
      }
    }

    // Reattach drag behavior
    if (!props.isReadonly) {
      const drag = createEntityDragBehavior(dragHandleElement, props.position, selected, props.workspace, props.id, visualDimensions);
      dragCleanup = drag.cleanup;
    } else {
      dragCleanup = () => {};
    }

    // Note: Don't call updateSize here - let syncGeometry() handle it with proper visual dimensions
  };

  buildContent(currentShape, currentColor);

  cleanups.push(() => {
    if (contentCleanup) contentCleanup();
    if (dragCleanup) dragCleanup();
  });

  const syncPosition = (): void => {
    const { x, y } = props.position.value;
    root.setAttribute('transform', `translate(${x},${y})`);
  };

  const syncSizeAndSelection = (): void => {
    const { width, height } = visualDimensions.value;
    if (updateSize) updateSize(width, height);
    resizeHandles.syncHandles(width, height, selected.value);
    selectionRing.syncRing(width, height, selected.value);
  };

  const syncGeometry = (): void => {
    syncPosition();
    syncSizeAndSelection();
  };

  // --- Selection ring ---
  const selectionRing = createEntitySelectionRing(selected, visualDimensions);
  root.appendChild(selectionRing.ring);
  cleanups.push(selectionRing.cleanup);

  // --- Resize handles ---
  const resizeHandles = createEntityResizeHandles(
    props.position, visualDimensions, selected, props.workspace, props.shape
  );
  if (!props.isReadonly) {
    resizeHandles.handles.forEach(h => root.appendChild(h));
  }
  cleanups.push(resizeHandles.cleanup);

  // Wire geometry sync after sub-factories are constructed
  if (props.position?.subscribe) cleanups.push(props.position.subscribe(syncPosition));
  if (visualDimensions?.subscribe) cleanups.push(visualDimensions.subscribe(syncSizeAndSelection));
  if (selected?.subscribe) cleanups.push(selected.subscribe(syncSizeAndSelection));

  // --- Connectors: typed port handles (workflow nodes) or the four side anchors (ER entities) ---
  const connectors = createEntityConnectors({
    instanceId: props.instanceId, entityId: props.id, shape: props.shape, ports: props.ports ?? [], root,
    position: props.position, dimensions: visualDimensions, workspace: props.workspace, isReadonly: !!props.isReadonly,
  });
  edgeElements.push(...connectors.edgeElements);
  cleanups.push(connectors.cleanup);

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
    notifyAnchorConnected: (anchorId) => { root.querySelectorAll('.vbs-port').forEach(h => { if (h.id === anchorId) h.setAttribute('data-connected', 'true'); }); },
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
