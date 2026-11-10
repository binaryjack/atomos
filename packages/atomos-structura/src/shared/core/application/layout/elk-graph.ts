// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Entity, LinkProps, PortSpec } from '@atomos-web/structura-core';
import type { ElkExtendedEdge, ElkNode, ElkPort, LayoutOptions } from 'elkjs/lib/elk-api.js';
import { parsePortAnchorId, toPortAnchorId } from '../../../workflow-node/model/port-anchor.js';
import { isHiddenByCollapse, visibleEndpoint } from '../../../workflow-canvas/group-model.js';

export interface ElkLayoutSettings {
  readonly direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  readonly nodeSpacing?: number;
  readonly layerSpacing?: number;
}

const ROOT_OPTIONS = (settings: ElkLayoutSettings): LayoutOptions => ({
  'elk.algorithm': 'layered',
  'elk.direction': settings.direction ?? 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.spacing.nodeNode': String(settings.nodeSpacing ?? 60),
  'elk.layered.spacing.nodeNodeBetweenLayers': String(settings.layerSpacing ?? 100),
  'elk.padding': '[top=48,left=24,bottom=24,right=24]',
});

/**
 * FIXED_ORDER ports: inputs on the WEST side, outputs on the EAST side, in declaration order.
 * ELK indexes ports clockwise from north, so west ports are numbered bottom-up.
 */
export const toElkPorts = (entityId: string, ports: readonly PortSpec[]): ElkPort[] => {
  const inputs = ports.filter(p => p.direction === 'in');
  const outputs = ports.filter(p => p.direction === 'out');
  const port = (p: PortSpec, side: 'WEST' | 'EAST', index: number): ElkPort => ({
    id: toPortAnchorId(entityId, p.id), width: 8, height: 8,
    layoutOptions: { 'elk.port.side': side, 'elk.port.index': String(index) },
  });
  return [
    ...outputs.map((p, i) => port(p, 'EAST', i)),
    ...inputs.map((p, i) => port(p, 'WEST', outputs.length + inputs.length - 1 - i)),
  ];
};

const toElkNode = (entity: Entity, all: readonly Entity[]): ElkNode => {
  const children = entity.collapsed ? [] : all.filter(e => e.parentId === entity.id);
  return {
    id: entity.id,
    width: entity.dimensions.width,
    height: entity.dimensions.height,
    ports: toElkPorts(entity.id, entity.ports ?? []),
    layoutOptions: {
      'elk.portConstraints': 'FIXED_ORDER',
      ...(children.length > 0 ? { 'elk.nodeSize.constraints': 'MINIMUM_SIZE' } : {}),
    },
    ...(children.length > 0 ? { children: children.map(child => toElkNode(child, all)) } : {}),
  };
};

/** Port-qualified ELK endpoint: typed ports connect port-to-port, ER anchors node-to-node. */
const endpointId = (entityId: string, anchorId: string): string =>
  (parsePortAnchorId(anchorId)?.nodeId === entityId ? anchorId : entityId);

const toElkEdge = (link: LinkProps, entities: readonly Entity[]): ElkExtendedEdge | null => {
  const source = visibleEndpoint(entities, link.leftEntityId, link.leftAnchorId, 'out');
  const target = visibleEndpoint(entities, link.rightEntityId, link.rightAnchorId, 'in');
  if (source.entityId === target.entityId) return null;
  return { id: link.id, sources: [endpointId(source.entityId, source.anchorId)], targets: [endpointId(target.entityId, target.anchorId)] };
};

/** Builds a hierarchical, port- and size-aware ELK graph from the stored schema. */
export const buildElkGraph = (
  entities: readonly Entity[], links: readonly LinkProps[], settings: ElkLayoutSettings = {}
): ElkNode => ({
  id: '__root__',
  layoutOptions: ROOT_OPTIONS(settings),
  children: entities.filter(e => !e.parentId || !entities.some(p => p.id === e.parentId)).map(e => toElkNode(e, entities)),
  edges: links.flatMap(link => {
    const edge = toElkEdge(link, entities);
    return edge && !isHiddenEdge(link, entities) ? [edge] : [];
  }),
});

const isHiddenEdge = (link: LinkProps, entities: readonly Entity[]): boolean =>
  isHiddenByCollapse(entities, link.leftEntityId) && isHiddenByCollapse(entities, link.rightEntityId)
  && visibleEndpoint(entities, link.leftEntityId, link.leftAnchorId, 'out').entityId
    === visibleEndpoint(entities, link.rightEntityId, link.rightAnchorId, 'in').entityId;

/** Sizes ELK computed for containers (expanded groups grow to fit their children). */
export const readElkContainerSizes = (
  root: ElkNode, out = new Map<string, { width: number; height: number }>()
): Map<string, { width: number; height: number }> => {
  (root.children ?? []).forEach(child => {
    if ((child.children ?? []).length > 0 && child.width && child.height) out.set(child.id, { width: child.width, height: child.height });
    readElkContainerSizes(child, out);
  });
  return out;
};

/** Absolute positions of every laid-out node (ELK child coordinates are parent-relative). */
export const readElkPositions = (
  root: ElkNode, offset = { x: 0, y: 0 }, out = new Map<string, { x: number; y: number }>()
): Map<string, { x: number; y: number }> => {
  (root.children ?? []).forEach(child => {
    const position = { x: offset.x + (child.x ?? 0), y: offset.y + (child.y ?? 0) };
    out.set(child.id, position);
    readElkPositions(child, position, out);
  });
  return out;
};
