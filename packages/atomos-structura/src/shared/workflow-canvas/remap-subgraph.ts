// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { parsePortAnchorId, toPortAnchorId } from '../workflow-node/model/port-anchor.js';

export interface SubgraphEntity {
  readonly id: string;
  readonly name: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly parentId?: string | undefined;
}

export interface SubgraphLink {
  readonly id?: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly sourceAnchorId?: string;
  readonly targetAnchorId?: string;
}

export interface RemappedLink {
  readonly id: string;
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
  readonly sourceAnchorId: string;
  readonly targetAnchorId: string;
}

export interface RemappedSubgraph<E extends SubgraphEntity> {
  readonly entities: readonly E[];
  readonly links: readonly RemappedLink[];
  readonly idMap: ReadonlyMap<string, string>;
}

/** Re-targets an anchor id at a new entity id (typed port and ER side anchors). */
export const remapAnchorId = (anchorId: string | undefined, oldId: string, newId: string, fallbackSide: string): string => {
  if (!anchorId) return `${newId}-anchor-${fallbackSide}`;
  const port = parsePortAnchorId(anchorId);
  if (port && port.nodeId === oldId) return toPortAnchorId(newId, port.portId);
  return anchorId.startsWith(`${oldId}-anchor-`) ? `${newId}${anchorId.slice(oldId.length)}` : `${newId}-anchor-${fallbackSide}`;
};

/**
 * Clones a copied subgraph with fresh ids, offset positions and remapped anchors.
 * Links are kept only when BOTH endpoints were copied.
 */
export const remapSubgraph = <E extends SubgraphEntity>(
  snapshot: { readonly entities: readonly E[]; readonly links: readonly SubgraphLink[] },
  createId: (oldId: string) => string,
  offset: { readonly x: number; readonly y: number },
  rename: (name: string) => string = name => name
): RemappedSubgraph<E> => {
  const idMap = new Map(snapshot.entities.map(entity => [entity.id, createId(entity.id)] as const));
  const entities = snapshot.entities.map(({ parentId, ...entity }) => {
    // A copied child stays inside its group only when the group was copied too.
    const parent = parentId ? idMap.get(parentId) : undefined;
    return {
      ...entity,
      ...(parent ? { parentId: parent } : {}),
      id: idMap.get(entity.id) as string,
      name: rename(entity.name),
      position: { x: entity.position.x + offset.x, y: entity.position.y + offset.y },
    } as unknown as E;
  });
  const links = snapshot.links.flatMap(link => {
    const source = idMap.get(link.sourceEntityId);
    const target = idMap.get(link.targetEntityId);
    if (!source || !target) return [];
    return [{
      id: createId(link.id ?? `${link.sourceEntityId}->${link.targetEntityId}`),
      sourceEntityId: source,
      targetEntityId: target,
      sourceAnchorId: remapAnchorId(link.sourceAnchorId, link.sourceEntityId, source, 'right'),
      targetAnchorId: remapAnchorId(link.targetAnchorId, link.targetEntityId, target, 'left'),
    }];
  });
  return { entities, links, idMap };
};
