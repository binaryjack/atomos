// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Cardinality, RenderType } from '@atomos-web/structura-core';
import type { WorkflowDocumentEdge, WorkflowDocumentNode } from './document.types.js';
import { type ErrorSink, isRecord, oneOf, optionalString, report, requireString } from './validation-primitives.js';

const CARDINALITIES: readonly Cardinality[] = ['1', '*', '0..1', '1..*'];
const RENDER_TYPES: readonly RenderType[] = ['linear', 'bezier', 'orthogonal'];
const DIRECTIONS = ['default', 'left', 'right'] as const;

const optionalFields = (sink: ErrorSink, raw: Record<string, unknown>, path: string) => {
  const strings = ['sourcePortId', 'targetPortId', 'sourceAnchorId', 'targetAnchorId', 'sourceProperty', 'targetProperty'] as const;
  const result: Record<string, string> = {};
  strings.forEach(key => {
    const value = optionalString(sink, raw, key, path);
    if (value !== undefined && value.length > 0) result[key] = value;
  });
  const sourceCardinality = oneOf(sink, raw['sourceCardinality'], CARDINALITIES, `${path}/sourceCardinality`);
  const targetCardinality = oneOf(sink, raw['targetCardinality'], CARDINALITIES, `${path}/targetCardinality`);
  const renderType = oneOf(sink, raw['renderType'], RENDER_TYPES, `${path}/renderType`);
  const direction = oneOf(sink, raw['direction'], DIRECTIONS, `${path}/direction`);
  return {
    ...result,
    ...(sourceCardinality !== undefined ? { sourceCardinality } : {}),
    ...(targetCardinality !== undefined ? { targetCardinality } : {}),
    ...(renderType !== undefined ? { renderType } : {}),
    ...(direction !== undefined ? { direction } : {}),
  };
};

export const validateEdge = (sink: ErrorSink, raw: unknown, path: string): WorkflowDocumentEdge | undefined => {
  if (!isRecord(raw)) {
    report(sink, path, 'invalid-type', `Expected an edge object at ${path}`);
    return undefined;
  }
  const id = requireString(sink, raw, 'id', path);
  const source = requireString(sink, raw, 'source', path);
  const target = requireString(sink, raw, 'target', path);
  const rest = optionalFields(sink, raw, path);
  if (id === undefined || source === undefined || target === undefined) return undefined;
  return { id, source, target, ...rest };
};

const checkPort = (
  sink: ErrorSink, node: WorkflowDocumentNode, portId: string | undefined,
  direction: 'in' | 'out', path: string
): void => {
  if (portId === undefined) return;
  const port = node.ports.find(p => p.id === portId);
  if (!port) {
    report(sink, path, 'unknown-port', `Node '${node.id}' has no port '${portId}'`);
  } else if (port.direction !== direction) {
    report(sink, path, 'invalid-value', `Port '${portId}' of node '${node.id}' is not an ${direction === 'in' ? 'input' : 'output'}`);
  }
};

/** Referential integrity: edge endpoints and ports must exist on the referenced nodes. */
export const checkEdgeReferences = (
  sink: ErrorSink,
  edges: readonly WorkflowDocumentEdge[],
  nodes: ReadonlyMap<string, WorkflowDocumentNode>
): void => {
  edges.forEach((edge, index) => {
    const path = `/edges/${index}`;
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source) report(sink, `${path}/source`, 'dangling-edge', `Edge '${edge.id}' references unknown node '${edge.source}'`);
    if (!target) report(sink, `${path}/target`, 'dangling-edge', `Edge '${edge.id}' references unknown node '${edge.target}'`);
    if (source) checkPort(sink, source, edge.sourcePortId, 'out', `${path}/sourcePortId`);
    if (target) checkPort(sink, target, edge.targetPortId, 'in', `${path}/targetPortId`);
  });
};
