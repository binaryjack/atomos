import type { DemoEntityProps, DemoEntityResult } from './types/demo-entity.types.js';
import type { EntityInstance } from '../../core/types/entity-instance.types.js';
import type { EdgePosition } from '../edge/types/edge-position.types.js';
import { createEdge } from '../edge/create-edge.js';
import { createSignal } from '../../core/create-signal.js';
import { createEntityContent } from './create-entity-content.js';
import { createEntitySelectionRing } from './create-entity-selection-ring.js';
import { createEntityResizeHandles } from './create-entity-resize-handles.js';
import { createEntityDragBehavior } from './create-entity-drag-behavior.js';

const EDGE_THICKNESS = 3 as const;

export const createDemoEntity = function(props: DemoEntityProps): DemoEntityResult {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const cleanups: Array<() => void> = [];
  const edgeElements: SVGGElement[] = [];

  const selected = createSignal(false);

  // --- HTML content inside foreignObject ---
  const content = createEntityContent({
    entitySignal: props.entitySignal,
    globalConfig:  props.globalConfig,
    storageProvider: props.storageProvider,
    onDelete: () => props.workspace.unregisterEntity(props.id),
    onSettingsClick: () => { /* TODO: open settings panel */ },
    onHeightChange: (h) => {
      props.dimensions.set({ width: props.dimensions.value.width, height: h });
    },
  });
  root.appendChild(content.foreignObject);
  cleanups.push(content.cleanup.destroy);

  // --- Geometry sync ---
  const syncGeometry = (): void => {
    const { x, y } = props.position.value;
    const { width, height } = props.dimensions.value;
    root.setAttribute('transform', `translate(${x},${y})`);
    content.updateSize(width, height);
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

  // --- Drag behavior (attached to header div so it only triggers from header) ---
  const drag = createEntityDragBehavior(content.dragHandle, props.position, selected, props.workspace);
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
