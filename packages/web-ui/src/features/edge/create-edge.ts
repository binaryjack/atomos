import { computeShapeAnchorPos } from '../../canvas/geometry/compute-shape-anchor-pos.js';
import { createSignal } from '../../core/create-signal.js';
import { createAnchor } from '../anchor/create-anchor.js';
import type { EdgeProps, EdgeResult, EdgeState } from './types/edge.types.js';
export type { EdgeProps, EdgeResult, EdgeState };

const HIT_SIZE = 32;

const applyRect = (el: SVGRectElement, g: { x: number; y: number; width: number; height: number }) => {
  el.setAttribute('x', g.x.toString());
  el.setAttribute('y', g.y.toString());
  el.setAttribute('width', g.width.toString());
  el.setAttribute('height', g.height.toString());
};

export const createEdge = function(props: EdgeProps): EdgeResult {
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const cleanups: Array<() => void> = [];
  const listeners: Array<{ target: EventTarget; type: string; listener: EventListener }> = [];

  const edgeState = createSignal<EdgeState>(props.state ?? 'default');

  // Geometry computations — all derived from entity position + dimensions signals

  const computeBar = (pos: { x: number; y: number }, dims: { width: number; height: number }) => {
    const t = props.thickness;
    switch (props.position) {
      case 'top':    return { x: pos.x,               y: pos.y - t,               width: dims.width,  height: t           };
      case 'bottom': return { x: pos.x,               y: pos.y + dims.height,     width: dims.width,  height: t           };
      case 'left':   return { x: pos.x - t,           y: pos.y,                   width: t,           height: dims.height };
      case 'right':  return { x: pos.x + dims.width,  y: pos.y,                   width: t,           height: dims.height };
    }
  };

  const computeHit = (pos: { x: number; y: number }, dims: { width: number; height: number }) => {
    switch (props.position) {
      case 'top':    return { x: pos.x,               y: pos.y - HIT_SIZE,        width: dims.width,  height: HIT_SIZE    };
      case 'bottom': return { x: pos.x,               y: pos.y + dims.height,     width: dims.width,  height: HIT_SIZE    };
      case 'left':   return { x: pos.x - HIT_SIZE,    y: pos.y,                   width: HIT_SIZE,    height: dims.height };
      case 'right':  return { x: pos.x + dims.width,  y: pos.y,                   width: HIT_SIZE,    height: dims.height };
    }
  };

  const computeAnchorPos = (pos: { x: number; y: number }, dims: { width: number; height: number }) => {
    return computeShapeAnchorPos(props.shape, { ...pos, ...dims }, props.position);
  };

  const pos0  = props.entityPosition.value;
  const dims0 = props.entityDimensions.value;

// Visual bar — now invisible as requested
  const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');   
  bar.setAttribute('fill', 'transparent');
  bar.setAttribute('opacity', '0');
  bar.setAttribute('rx', '1');
  bar.style.pointerEvents = 'none';
  // CSS transition for color/opacity; thickness is changed via attribute in hover handlers
  bar.style.transition = 'opacity 0.12s ease, fill 0.12s ease';
  applyRect(bar, computeBar(pos0, dims0));

  // Transparent hit area — wider than bar for comfortable hover
  const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  hit.setAttribute('fill', 'transparent');
  hit.setAttribute('pointer-events', 'all');
  hit.style.cursor = 'crosshair';
  applyRect(hit, computeHit(pos0, dims0));

  // Anchor position signal — updated reactively when entity moves
  const anchorPos = createSignal(computeAnchorPos(pos0, dims0));

  // Single update function for all geometry — called when entity position or dimensions change
  const onEntityChange = () => {
    const p = props.entityPosition.value;
    const d = props.entityDimensions.value;
    applyRect(bar, computeBar(p, d));
    applyRect(hit, computeHit(p, d));
    anchorPos.set(computeAnchorPos(p, d));
  };

  cleanups.push(props.entityPosition.subscribe(onEntityChange));
  cleanups.push(props.entityDimensions.subscribe(onEntityChange));

  // Container-level hover using mouseover/mouseout with relatedTarget guard.
  // This correctly handles pointer movement between bar/hit/anchor without false leave events.
  let hovered = false;
  let anchorResult: ReturnType<typeof createAnchor> | undefined;

  const thickHover = (props.thickness + 2) as 5 | 7;

  const onHoverEnter = () => {
    if (hovered) return;
    hovered = true;
    bar.setAttribute('fill', 'transparent');
    bar.setAttribute('opacity', '0');
    // Grow bar thickness
    const p = props.entityPosition.value;
    const d = props.entityDimensions.value;
    const thick = { ...computeBar(p, d) };
    // Override the thin dimension with hover thickness
    const extra = thickHover - props.thickness;
    if (props.position === 'top' || props.position === 'bottom') thick.height = thickHover;
    else thick.width = thickHover;
    if (props.position === 'top')  thick.y -= extra;
    if (props.position === 'left') thick.x -= extra;
    applyRect(bar, thick);
    anchorResult?.updateState('hover');
    props.onHover?.(true);
  };

  const onHoverLeave = () => {
    if (!hovered) return;
    hovered = false;
    bar.setAttribute('fill', 'transparent');
    bar.setAttribute('opacity', '0');
    // Reset bar to normal thickness
    applyRect(bar, computeBar(props.entityPosition.value, props.entityDimensions.value));
    anchorResult?.updateState('idle');
    props.onHover?.(false);
  };

  const onMouseOver = (e: Event) => {
    const me = e as MouseEvent;
    if (me.relatedTarget && container.contains(me.relatedTarget as Node)) return;
    onHoverEnter();
  };

  const onMouseOut = (e: Event) => {
    const me = e as MouseEvent;
    if (me.relatedTarget && container.contains(me.relatedTarget as Node)) return;
    onHoverLeave();
  };

  container.addEventListener('mouseover', onMouseOver);
  container.addEventListener('mouseout', onMouseOut);
  listeners.push(
    { target: container, type: 'mouseover', listener: onMouseOver },
    { target: container, type: 'mouseout', listener: onMouseOut }
  );

  // Anchor — edge is sole controller of its idle/hover state
  anchorResult = createAnchor({
    id: props.anchorId,
    position: anchorPos,
    edgePosition: props.position,
    connected: false,
    radius: 7,
    onConnect: (linkId) => props.onAnchorConnect?.(props.anchorId, linkId),
    onMouseDown: (event) => props.onAnchorMouseDown?.(event, props.anchorId),
    onMouseUp:   (event) => props.onAnchorMouseUp?.(event, props.anchorId)
  });

  // DOM order: bar (bottom visual), anchor (above bar), hit (top — captures hover events)
  // hit is last so it covers bar area; anchor circle is above bar but below hit by index
  // SVG: later elements receive events first. Anchor circle must come AFTER hit to receive clicks.
  // Solution: put anchor AFTER hit so it is on top and captures its own events.
  container.appendChild(bar);
  container.appendChild(hit);
  container.appendChild(anchorResult.element);
  cleanups.push(anchorResult.cleanup.destroy);

  const updateState = (state: EdgeState) => {
    edgeState.set(state);
    props.onStateChange?.(state);
  };

  return {
    element: container,
    updateState,
    getAnchorPosition: () => anchorPos.value,
    cleanup: {
      destroy: () => {
        listeners.forEach(({ target, type, listener }) => target.removeEventListener(type, listener));
        cleanups.forEach(fn => fn());
        listeners.length = 0;
        cleanups.length = 0;
      }
    }
  };
};
