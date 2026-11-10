// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { DomainLink } from '../../../shared/core/domain/entity-aggregate.js';
import { determineOptimalEdges } from '../../../shared/core/math/anchor-routing.js';
import { isPortAnchorId } from '../../../shared/workflow-node/model/port-anchor.js';

type Positioned = { id: string; position: { x: number; y: number }; dimensions: { width: number; height: number } };

const HORIZONTAL_SPACING = 350;
const VERTICAL_SPACING = 250;
const START_X = 100;
const START_Y = 100;

/** Longest-path layering (Kahn); nodes left in cycles form a final level. */
const computeLevels = (nodes: readonly Positioned[], edges: readonly DomainLink[]): string[][] => {
  const inDegree = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const children = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  edges.forEach(e => {
    inDegree.set(e.targetEntityId, (inDegree.get(e.targetEntityId) ?? 0) + 1);
    children.get(e.sourceEntityId)?.push(e.targetEntityId);
  });
  const levels: string[][] = [];
  const processed = new Set<string>();
  let current = Array.from(inDegree.entries()).filter(([, d]) => d === 0).map(([id]) => id);
  while (current.length > 0) {
    levels.push(current);
    current.forEach(id => processed.add(id));
    const next: string[] = [];
    current.forEach(id => (children.get(id) ?? []).forEach(child => {
      const degree = (inDegree.get(child) ?? 0) - 1;
      inDegree.set(child, degree);
      if (degree === 0 && !processed.has(child)) next.push(child);
    }));
    current = next;
  }
  const cyclic = nodes.filter(n => !processed.has(n.id)).map(n => n.id);
  if (cyclic.length > 0) levels.push(cyclic);
  return levels;
};

/** Mutates node positions into a staggered left-to-right layered layout and picks optimal link sides. */
export const processViewerAutoLayout = (nodes: Positioned[], edges: DomainLink[]): void => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  computeLevels(nodes, edges).forEach((levelNodes, levelIndex) => {
    const x = START_X + levelIndex * HORIZONTAL_SPACING;
    const stagger = (levelIndex % 2) * (VERTICAL_SPACING / 2);
    const startY = Math.max(START_Y, (1000 - levelNodes.length * VERTICAL_SPACING) / 2) + stagger;
    levelNodes.forEach((id, index) => {
      const node = nodeMap.get(id);
      if (node) node.position = { x, y: startY + index * VERTICAL_SPACING };
    });
  });
  edges.forEach(link => {
    const src = nodeMap.get(link.sourceEntityId);
    const dst = nodeMap.get(link.targetEntityId);
    if (!src || !dst || isPortAnchorId(link.sourceAnchorId) || isPortAnchorId(link.targetAnchorId)) return;
    const { srcEdge, dstEdge } = determineOptimalEdges({ ...src.position, ...src.dimensions }, { ...dst.position, ...dst.dimensions });
    const mutable = link as { sourceAnchorId: string; targetAnchorId: string };
    mutable.sourceAnchorId = `${src.id}-anchor-${srcEdge}`;
    mutable.targetAnchorId = `${dst.id}-anchor-${dstEdge}`;
  });
};
