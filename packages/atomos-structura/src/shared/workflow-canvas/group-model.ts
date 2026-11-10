// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LinkProps, PortSpec } from '@atomos-web/structura-core';
import { parsePortAnchorId, toPortAnchorId } from '../workflow-node/model/port-anchor.js';

/** Built-in node type of container nodes (groups / subflows). Children carry `parentId`. */
export const GROUP_NODE_TYPE = 'group';

type Nodes = readonly {
  readonly id: string;
  readonly name: string;
  readonly parentId?: string | undefined;
  readonly collapsed?: boolean | undefined;
}[];

/** Parent chain of a node, nearest first. Cycles are cut defensively. */
export const ancestorsOf = (entities: Nodes, entityId: string): string[] => {
  const byId = new Map(entities.map(e => [e.id, e]));
  const chain: string[] = [];
  let current = byId.get(entityId)?.parentId;
  while (current && !chain.includes(current) && byId.has(current)) {
    chain.push(current);
    current = byId.get(current)?.parentId;
  }
  return chain;
};

/** Every node nested (at any depth) inside `groupId`. */
export const descendantsOf = (entities: Nodes, groupId: string): string[] =>
  entities.filter(e => ancestorsOf(entities, e.id).includes(groupId)).map(e => e.id);

/** Outermost collapsed ancestor: the node that visually stands in for a hidden node. */
export const collapsedRepresentative = (entities: Nodes, entityId: string): string | undefined => {
  const collapsed = new Set(entities.filter(e => e.collapsed).map(e => e.id));
  return ancestorsOf(entities, entityId).filter(id => collapsed.has(id)).pop();
};

export const isHiddenByCollapse = (entities: Nodes, entityId: string): boolean =>
  collapsedRepresentative(entities, entityId) !== undefined;

/** Stable id of the boundary proxy port standing in for a hidden endpoint. */
export const proxyPortId = (direction: 'in' | 'out', entityId: string, anchorId: string): string =>
  `proxy-${direction}.${entityId}.${parsePortAnchorId(anchorId)?.portId ?? 'node'}`;

/**
 * Visible endpoint of a link end: itself when visible, otherwise the boundary proxy port
 * of its outermost collapsed group.
 */
export const visibleEndpoint = (
  entities: Nodes, entityId: string, anchorId: string, direction: 'in' | 'out'
): { entityId: string; anchorId: string } => {
  const representative = collapsedRepresentative(entities, entityId);
  if (!representative) return { entityId, anchorId };
  return { entityId: representative, anchorId: toPortAnchorId(representative, proxyPortId(direction, entityId, anchorId)) };
};

/** Proxy ports a collapsed group exposes for every link crossing its boundary. */
export const computeProxyPorts = (entities: Nodes, links: readonly LinkProps[], groupId: string): PortSpec[] => {
  const names = new Map(entities.map(e => [e.id, e.name]));
  const ports = new Map<string, PortSpec>();
  links.forEach(link => {
    const source = visibleEndpoint(entities, link.leftEntityId, link.leftAnchorId, 'out');
    const target = visibleEndpoint(entities, link.rightEntityId, link.rightAnchorId, 'in');
    if (source.entityId === target.entityId) return;
    if (source.entityId === groupId) {
      const id = proxyPortId('out', link.leftEntityId, link.leftAnchorId);
      ports.set(id, { id, direction: 'out', dataType: 'any', multiple: true, label: names.get(link.leftEntityId) ?? link.leftEntityId });
    }
    if (target.entityId === groupId) {
      const id = proxyPortId('in', link.rightEntityId, link.rightAnchorId);
      ports.set(id, { id, direction: 'in', dataType: 'any', multiple: true, label: names.get(link.rightEntityId) ?? link.rightEntityId });
    }
  });
  return Array.from(ports.values());
};
