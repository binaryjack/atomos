import { createSignal } from '../../core/create-signal.js';
import type { EntityInstance } from '../../core/types/entity-instance.types.js';
import { createEdge } from '../edge/create-edge.js';
import type { EdgePosition } from '../edge/types/edge-position.types.js';
import { createEntitySettingsModal } from '../modal/create-entity-settings-modal.js';
import { createCompactEntityContent } from './create-compact-entity-content.js';
import { createEntityContent } from './create-entity-content.js';
import { createEntityDragBehavior } from './create-entity-drag-behavior.js';
import { createEntityResizeHandles } from './create-entity-resize-handles.js';
import { createEntitySelectionRing } from './create-entity-selection-ring.js';
import type { DemoEntityProps, DemoEntityResult } from './types/demo-entity.types.js';

const EDGE_THICKNESS = 3 as const;

export const createDemoEntity = function(props: DemoEntityProps): DemoEntityResult {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const cleanups: Array<() => void> = [];
  const edgeElements: SVGGElement[] = [];

  const selected = createSignal(false);

  // --- Entity appearance (Rectangle table vs Compact Shape) ---
  let contentElement: SVGElement;
  let dragHandleElement: HTMLElement | SVGElement;
  let updateSize: (w: number, h: number) => void;
  
  if (props.shape === 'box' || props.shape === 'rectangle' || !props.shape) {
    const content = createEntityContent({
      entityStore: props.entityStore,
      globalConfig: props.globalConfig,
      storageProvider: props.storageProvider,
      color: props.color,
      onDelete: () => props.workspace.unregisterEntity(props.id),
      onSettingsClick: () => {
        const modal = createEntitySettingsModal(props.id);
        document.body.appendChild(modal);
        modal.open().catch(err => console.error(err));
      },
      onHeightChange: (h) => {
        props.dimensions.set({ width: props.dimensions.value.width, height: h });
      },
    });
    contentElement = content.foreignObject;
    dragHandleElement = content.dragHandle;
    updateSize = content.updateSize;
    cleanups.push(content.cleanup.destroy);
  } else {
    // For compact shapes (cylinder, actor, document, note)
    const content = createCompactEntityContent({
      shape: props.shape as any,
      color: props.color,
      entitySignal: props.entityStore.signal,
      onDoubleClick: () => {
        const modal = createEntitySettingsModal(props.id);
        document.body.appendChild(modal);
        modal.open().catch(err => console.error(err));
      }
    });
    contentElement = content.rootElement;
    dragHandleElement = content.dragHandle;
    updateSize = content.updateSize;
    cleanups.push(content.cleanup.destroy);
  }
  
  root.appendChild(contentElement);

  // --- Geometry sync ---
  const syncGeometry = (): void => {
    const { x, y } = props.position.value;
    const { width, height } = props.dimensions.value;
    root.setAttribute('transform', `translate(${x},${y})`);
    updateSize(width, height);
    resizeHandles.syncHandles(width, height, selected.value);
    selectionRing.syncRing(width, height, selected.value);
  };

  // --- Selection ring ---
  const selectionRing = createEntitySelectionRing(selected, props.dimensions);
  root.appendChild(selectionRing.ring);
  cleanups.push(selectionRing.cleanup);

  // --- Resize handles ---
  const resizeHandles = createEntityResizeHandles(
    props.position, props.dimensions, selected, props.workspace
  );
  resizeHandles.handles.forEach(h => root.appendChild(h));
  cleanups.push(resizeHandles.cleanup);

  // Wire geometry sync after sub-factories are constructed
  cleanups.push(props.position.subscribe(syncGeometry));
  cleanups.push(props.dimensions.subscribe(syncGeometry));
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
      entityDimensions: props.dimensions,
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

  // --- Drag behavior (attached to header div or shape root) ---
  const drag = createEntityDragBehavior(dragHandleElement, props.position, selected, props.workspace);
  cleanups.push(drag.cleanup);

  // Initial render
  syncGeometry();

  const instance: EntityInstance = {
    id: props.id,
    element: root,
    position: props.position,
    dimensions: props.dimensions,
    cleanup: () => { cleanups.forEach(fn => fn()); cleanups.length = 0; },
    notifyAnchorConnected: (_anchorId, _linkId) => { /* visual state: TODO */ }
  };

  return {
    element: root,
    edgeElements,
    instance,
    cleanup: () => instance.cleanup()
  };
};
