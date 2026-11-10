// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { WorkflowDocumentNode } from './document.types.js';
import { type ErrorSink, report } from './validation-primitives.js';

/** Node type of group containers; `parentId` must reference a node of this type. */
export const GROUP_DOCUMENT_TYPE = 'group';

const hasCycle = (nodeId: string, byId: ReadonlyMap<string, WorkflowDocumentNode>): boolean => {
  const seen = new Set<string>([nodeId]);
  let current = byId.get(nodeId)?.parentId;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = byId.get(current)?.parentId;
  }
  return false;
};

/** v3 containment rules: parents exist, are groups, and never form a cycle. */
export const checkParentReferences = (sink: ErrorSink, nodes: readonly WorkflowDocumentNode[]): void => {
  const byId = new Map(nodes.map(node => [node.id, node]));
  nodes.forEach((node, index) => {
    if (!node.parentId) return;
    const path = `/nodes/${index}/parentId`;
    const parent = byId.get(node.parentId);
    if (!parent) {
      report(sink, path, 'dangling-edge', `Node '${node.id}' references unknown parent '${node.parentId}'`);
    } else if (parent.type !== GROUP_DOCUMENT_TYPE) {
      report(sink, path, 'invalid-value', `Parent '${parent.id}' of node '${node.id}' is not a group`);
    } else if (hasCycle(node.id, byId)) {
      report(sink, path, 'invalid-value', `Node '${node.id}' is part of a containment cycle`);
    }
  });
};
