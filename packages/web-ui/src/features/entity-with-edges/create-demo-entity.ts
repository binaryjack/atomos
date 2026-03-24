import type { DemoEntityProps, DemoEntityResult } from './types/demo-entity.types.js';
import { createEdge } from '../edge/create-edge.js';

const EDGE_THICKNESS = 5 as const;

export const createDemoEntity = function(props: DemoEntityProps): DemoEntityResult {
  const root = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const cleanups: Array<() => void> = [];
  const edgeElements: SVGGElement[] = [];

  // --- Body rect (local coords 0,0) ---
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  body.setAttribute('rx', '6');
  body.setAttribute('fill', '#1e293b');
  body.setAttribute('stroke', '#334155');
  body.setAttribute('stroke-width', '1.5');
  body.style.cursor = 'move';

  // --- Title label ---
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('fill', '#f1f5f9');
  label.setAttribute('font-size', '13');
  label.setAttribute('font-family', 'system-ui, sans-serif');
  label.setAttribute('font-weight', '600');
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('text-anchor', 'middle');
  label.textContent = props.title;

  root.appendChild(body);
  root.appendChild(label);

  // --- Geometry sync ---
  // The root g uses a transform so body/label are in local (entity) space.
  // Edges use the world-space position/dimensions signals directly and must
  // be appended to the SVG canvas, not to root.
  const syncGeometry = () => {
    const { x, y } = props.position.value;
    const { width, height } = props.dimensions.value;
    root.setAttribute('transform', `translate(${x},${y})`);
    body.setAttribute('x', '0');
    body.setAttribute('y', '0');
    body.setAttribute('width', width.toString());
    body.setAttribute('height', height.toString());
    label.setAttribute('x', (width / 2).toString());
    label.setAttribute('y', (height / 2).toString());
  };

  cleanups.push(props.position.subscribe(syncGeometry));
  cleanups.push(props.dimensions.subscribe(syncGeometry));
  syncGeometry();

  // --- Edges (world-space, must live on canvas layer) ---
  const anchorIds = {
    top:    `${props.id}-anchor-top`,
    bottom: `${props.id}-anchor-bottom`,
    left:   `${props.id}-anchor-left`,
    right:  `${props.id}-anchor-right`,
  } as const;

  (['top', 'bottom', 'left', 'right'] as const).forEach((side) => {
    const edge = createEdge({
      position: side,
      entityId: props.id,
      entityPosition: props.position,
      entityDimensions: props.dimensions,
      thickness: EDGE_THICKNESS,
      anchorId: anchorIds[side],
      onAnchorMouseDown: (event, anchorId) => {
        props.workspace.startLinkFromAnchor(anchorId, edge.getAnchorPosition(), props.id, event);
      }
    });

    edgeElements.push(edge.element);

    cleanups.push(() => {
      edge.cleanup.destroy();
      if (edge.element.parentNode) edge.element.parentNode.removeChild(edge.element);
    });
  });

  // --- Drag (SVG coordinate-space) ---
  let dragging = false;
  let dragStart = { svgX: 0, svgY: 0, posX: 0, posY: 0 };

  const onBodyMouseDown = (e: Event) => {
    const me = e as MouseEvent;
    me.stopPropagation();
    const svg = props.workspace.screenToSvgCoords(me.clientX, me.clientY);
    dragging = true;
    dragStart = { svgX: svg.x, svgY: svg.y, posX: props.position.value.x, posY: props.position.value.y };
    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
  };

  const onDocMouseMove = (e: Event) => {
    if (!dragging) return;
    const me = e as MouseEvent;
    const svg = props.workspace.screenToSvgCoords(me.clientX, me.clientY);
    props.position.set({
      x: dragStart.posX + (svg.x - dragStart.svgX),
      y: dragStart.posY + (svg.y - dragStart.svgY)
    });
  };

  const onDocMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('mouseup', onDocMouseUp);
  };

  body.addEventListener('mousedown', onBodyMouseDown as EventListener);
  cleanups.push(() => {
    body.removeEventListener('mousedown', onBodyMouseDown as EventListener);
    document.removeEventListener('mousemove', onDocMouseMove);
    document.removeEventListener('mouseup', onDocMouseUp);
  });

  return {
    element: root,
    edgeElements,
    cleanup: () => {
      cleanups.forEach(fn => fn());
      cleanups.length = 0;
    }
  };
};