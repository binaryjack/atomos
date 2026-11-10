// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import type { Signal } from '../../shared/core/types/signal.types.js';
import type { WorkspaceManager } from '../../shared/core/types/workspace-manager.types.js';
import { createEdge } from '../edge/create-edge.js';
import type { EdgePosition } from '../edge/types/edge-position.types.js';
import { createPortHandles } from '../workflow-ports/create-port-handles.js';

const EDGE_THICKNESS = 3 as const;
const SIDES: readonly EdgePosition[] = ['top', 'bottom', 'left', 'right'];

export interface EntityConnectorsProps {
  readonly instanceId: string;
  readonly entityId: string;
  readonly shape?: string | undefined;
  readonly ports: readonly PortSpec[];
  readonly root: SVGGElement;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly workspace: WorkspaceManager;
  readonly isReadonly: boolean;
}

export interface EntityConnectors {
  /** Side-anchor edge elements that must be appended to the canvas (world coordinates). */
  readonly edgeElements: SVGGElement[];
  readonly cleanup: () => void;
}

/** Typed nodes get port handles inside the node; ER entities keep the four side anchors. */
export const createEntityConnectors = function(props: EntityConnectorsProps): EntityConnectors {
  if (props.ports.length > 0) {
    const handles = createPortHandles({ ...props });
    props.root.appendChild(handles.element);
    return { edgeElements: [], cleanup: handles.cleanup };
  }
  if (props.isReadonly) return { edgeElements: [], cleanup: () => undefined };
  const cleanups: Array<() => void> = [];
  const edgeElements = SIDES.map(side => {
    const anchorId = `${props.entityId}-anchor-${side}`;
    const edge = createEdge({
      position: side,
      entityId: props.entityId,
      shape: props.shape as never,
      entityPosition: props.position,
      entityDimensions: props.dimensions,
      thickness: EDGE_THICKNESS,
      anchorId,
      onHover: (hovered) => {
        if (hovered) props.workspace.notifyAnchorHoverStart(anchorId, props.entityId, side);
        else props.workspace.notifyAnchorHoverEnd();
      },
      onAnchorMouseDown: (event, id) => props.workspace.startLinkFromAnchor(id, edge.getAnchorPosition(), props.entityId, side, event),
      onAnchorMouseUp: (_event, id) => props.workspace.finalizeLinkToAnchor(id, edge.getAnchorPosition(), props.entityId, side),
    });
    edge.element.setAttribute('data-entity-edge-for', props.entityId); // lets viewport culling detach it
    cleanups.push(() => { edge.cleanup.destroy(); edge.element.remove(); });
    return edge.element;
  });
  return { edgeElements, cleanup: () => cleanups.forEach(fn => fn()) };
};
