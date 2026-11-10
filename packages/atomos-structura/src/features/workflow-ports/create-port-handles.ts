// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import type { Signal } from '../../shared/core/types/signal.types.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import { getCanvasRuntime } from '../../shared/workflow-canvas/canvas-runtime.js';
import { toPortAnchorId } from '../../shared/workflow-node/model/port-anchor.js';
import { layoutPorts, type PortPlacement } from '../../shared/workflow-node/model/port-layout.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
export const PORT_RADIUS = 6;

export interface PortHandlesProps {
  readonly instanceId: string;
  readonly entityId: string;
  readonly ports: readonly PortSpec[];
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly workspace: WorkspaceManager;
  readonly isReadonly: boolean;
}

export interface PortHandlesResult {
  /** Group rendered inside the node root (node-local coordinates). */
  readonly element: SVGGElement;
  readonly cleanup: () => void;
}

const describePort = (port: PortSpec): string =>
  `${port.direction === 'in' ? 'Input' : 'Output'} port ${port.label ?? port.id} (${port.dataType})`;

const createHandle = (entityId: string, placement: PortPlacement): SVGGElement => {
  const { port } = placement;
  const handle = document.createElementNS(SVG_NS, 'g');
  handle.id = toPortAnchorId(entityId, port.id);
  handle.classList.add('vbs-port', `vbs-port-${port.direction}`);
  handle.dataset.portId = port.id;
  handle.dataset.direction = port.direction;
  handle.dataset.dataType = port.dataType;
  handle.setAttribute('role', 'button');
  handle.setAttribute('aria-label', describePort(port));
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('r', String(PORT_RADIUS));
  circle.setAttribute('fill', port.direction === 'in' ? '#0f172a' : '#3b82f6');
  circle.setAttribute('stroke', port.required ? '#f59e0b' : '#93c5fd');
  circle.setAttribute('stroke-width', '2');
  circle.style.cursor = port.direction === 'out' ? 'crosshair' : 'pointer';
  const label = document.createElementNS(SVG_NS, 'text');
  label.textContent = port.label ?? port.id;
  label.setAttribute('font-size', '10');
  label.setAttribute('fill', '#cbd5e1');
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('text-anchor', port.direction === 'in' ? 'start' : 'end');
  label.setAttribute('x', String(port.direction === 'in' ? PORT_RADIUS + 4 : -(PORT_RADIUS + 4)));
  label.style.pointerEvents = 'none';
  handle.append(circle, label);
  return handle;
};

/**
 * Renders typed ports as distinct handles (inputs left, outputs right, evenly spaced).
 * Each handle has the stable DOM id `${entityId}::${portId}` and is registered on the
 * canvas runtime so connection previews can highlight it.
 */
export const createPortHandles = function(props: PortHandlesProps): PortHandlesResult {
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('vbs-port-handles');
  const runtime = getCanvasRuntime(props.instanceId);
  const handles = new Map<string, { element: SVGGElement; placement: PortPlacement }>();

  const place = (): void => {
    layoutPorts(props.ports, props.dimensions.value).forEach(placement => {
      handles.get(placement.port.id)?.element.setAttribute('transform', `translate(${placement.local.x},${placement.local.y})`);
    });
  };

  layoutPorts(props.ports, props.dimensions.value).forEach(placement => {
    const element = createHandle(props.entityId, placement);
    handles.set(placement.port.id, { element, placement });
    runtime.portHandles.set(element.id, { anchorId: element.id, nodeId: props.entityId, port: placement.port, element });
    // Boundary proxy ports of collapsed groups are display-only.
    if (!props.isReadonly && !placement.port.id.startsWith('proxy-')) bindHandle(props, element, placement.port);
    group.appendChild(element);
  });
  place();
  const unsubscribe = props.dimensions.subscribe(place);

  return {
    element: group,
    cleanup: () => {
      unsubscribe();
      handles.forEach(({ element }) => runtime.portHandles.delete(element.id));
      group.remove();
    },
  };
};

/** Output handles start a connection; input handles complete one. */
const bindHandle = (props: PortHandlesProps, element: SVGGElement, port: PortSpec): void => {
  const worldPosition = (): { x: number; y: number } => {
    const placement = layoutPorts(props.ports, props.dimensions.value).find(p => p.port.id === port.id);
    const origin = props.position.value;
    return { x: origin.x + (placement?.local.x ?? 0), y: origin.y + (placement?.local.y ?? 0) };
  };
  element.addEventListener('pointerdown', (event: PointerEvent) => {
    if (port.direction !== 'out' || event.button !== 0) return;
    event.stopPropagation();
    props.workspace.startLinkFromAnchor(element.id, worldPosition(), props.entityId, 'right', event);
  });
  element.addEventListener('pointerup', (event: PointerEvent) => {
    if (port.direction !== 'in') return;
    event.stopPropagation();
    props.workspace.finalizeLinkToAnchor(element.id, worldPosition(), props.entityId, 'left');
  });
};
