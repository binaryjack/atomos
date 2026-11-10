// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import type { Signal } from '../types/signal.types.js';
import { isPortAnchorId, toPortAnchorId } from '../../workflow-node/model/port-anchor.js';
import { layoutPorts } from '../../workflow-node/model/port-layout.js';
import { type AnchorSide, sideAnchorPosition } from '../../workflow-node/model/resolve-anchor-position.js';
import { testEdgeHit } from '../create-edge-hit-tester.js';
import type { EntityInstance } from '../types/entity-instance.types.js';
import type { WorkspaceState } from '../types/workspace-state.types.js';

/** Maximum distance (canvas units) at which a dragged connection snaps to an input port. */
export const PORT_SNAP_RADIUS = 32;

export interface LinkDropTarget {
  readonly anchorId: string;
  readonly entityId: string;
  readonly edge: AnchorSide;
  readonly position: { readonly x: number; readonly y: number };
  readonly distance: number;
}

type PortsLookup = (entityId: string) => readonly PortSpec[] | undefined;
type Point = { readonly x: number; readonly y: number };

const rectOf = (entity: EntityInstance) => ({ ...entity.position.value, ...entity.dimensions.value });

const closer = (best: LinkDropTarget | undefined, candidate: LinkDropTarget): LinkDropTarget =>
  (!best || candidate.distance < best.distance ? candidate : best);

const nearestInputPort = (entityId: string, entity: EntityInstance, ports: readonly PortSpec[], point: Point) => {
  const rect = rectOf(entity);
  let best: LinkDropTarget | undefined;
  layoutPorts(ports, rect).filter(p => p.port.direction === 'in').forEach(placement => {
    const position = { x: rect.x + placement.local.x, y: rect.y + placement.local.y };
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance > PORT_SNAP_RADIUS) return;
    best = closer(best, { anchorId: toPortAnchorId(entityId, placement.port.id), entityId, edge: 'left', position, distance });
  });
  return best;
};

const nearestSide = (entityId: string, entity: EntityInstance, point: Point) => {
  let best: LinkDropTarget | undefined;
  (['top', 'bottom', 'left', 'right'] as AnchorSide[]).forEach(side => {
    if (!testEdgeHit(entity, side, point)) return;
    const position = sideAnchorPosition(rectOf(entity), side);
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    best = closer(best, { anchorId: `${entityId}-anchor-${side}`, entityId, edge: side, position, distance });
  });
  return best;
};

/**
 * Finds where a dragged connection would land: typed port drags only snap to input ports;
 * legacy anchor drags snap to the hovered side of entities that have no typed ports.
 */
export const findLinkDropTarget = (
  workspaceState: Signal<WorkspaceState>, portsOf: PortsLookup, sourceEntityId: string, sourceAnchorId: string, point: Point
): LinkDropTarget | undefined => {
  const fromPort = isPortAnchorId(sourceAnchorId);
  let best: LinkDropTarget | undefined;
  workspaceState.value.entities.forEach((entity, entityId) => {
    if (entityId === sourceEntityId) return;
    const ports = portsOf(entityId) ?? [];
    const candidate = fromPort
      ? (ports.length > 0 ? nearestInputPort(entityId, entity, ports, point) : undefined)
      : (ports.length === 0 ? nearestSide(entityId, entity, point) : undefined);
    if (candidate) best = closer(best, candidate);
  });
  return best;
};
