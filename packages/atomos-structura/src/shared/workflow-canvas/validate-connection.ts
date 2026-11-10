// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import {
  ACCEPT, type ConnectionGraph, type ConnectionGraphNode, type ConnectionOptions, type ConnectionValidator,
  type ConnectionVerdict, defaultIsAssignable, type PortRef, reject,
} from './connection-validation.types.js';
import { checkTopology, hasPath } from './topology-checks.js';

const samePort = (a: PortRef, b: PortRef): boolean => a.nodeId === b.nodeId && a.portId === b.portId;

const findPort = (node: ConnectionGraphNode, portId: string): PortSpec | undefined =>
  node.ports.find(port => port.id === portId);

const checkDirections = (
  source: ConnectionGraphNode, target: ConnectionGraphNode, src: PortRef, dst: PortRef
): ConnectionVerdict => {
  if (source.ports.length > 0) {
    const port = findPort(source, src.portId);
    if (!port) return reject(`Node "${src.nodeId}" has no port "${src.portId}"`);
    if (port.direction !== 'out') return reject(`Port "${src.portId}" is an input and cannot start a connection`);
  }
  if (target.ports.length > 0) {
    const port = findPort(target, dst.portId);
    if (!port) return reject(`Node "${dst.nodeId}" has no port "${dst.portId}"`);
    if (port.direction !== 'in') return reject(`Port "${dst.portId}" is an output and cannot receive a connection`);
  }
  return ACCEPT;
};

const checkMultiplicity = (
  graph: ConnectionGraph, srcPort: PortSpec | undefined, dstPort: PortSpec | undefined, src: PortRef, dst: PortRef
): ConnectionVerdict => {
  if (graph.edges.some(e => samePort(e.source, src) && samePort(e.target, dst))) {
    return reject('These ports are already connected');
  }
  if (dstPort && dstPort.multiple !== true && graph.edges.some(e => samePort(e.target, dst))) {
    return reject(`Input "${dst.portId}" accepts a single connection`);
  }
  if (srcPort && srcPort.multiple === false && graph.edges.some(e => samePort(e.source, src))) {
    return reject(`Output "${src.portId}" accepts a single connection`);
  }
  return ACCEPT;
};

const checkGraphRules = (
  graph: ConnectionGraph, source: ConnectionGraphNode, target: ConnectionGraphNode, options: ConnectionOptions
): ConnectionVerdict => {
  if (options.preventCycles && hasPath(graph, target.id, source.id)) {
    return reject('Connection would create a cycle');
  }
  return options.topology ? checkTopology(source, target, graph, options.topology) : ACCEPT;
};

/**
 * Built-in checks (in order): nodes exist, no self loop, out -> in direction, no duplicate,
 * `multiple` respected, data types assignable, optional cycle prevention, optional topology
 * rules; then the custom validator, if any. Pure: never mutates the graph.
 */
export const validateConnection = (
  src: PortRef, dst: PortRef, graph: ConnectionGraph,
  options: ConnectionOptions = {}, custom?: ConnectionValidator
): ConnectionVerdict => {
  const source = graph.nodes.get(src.nodeId);
  const target = graph.nodes.get(dst.nodeId);
  if (!source || !target) return reject('Unknown source or target node');
  if (source.id === target.id) return reject('A node cannot connect to itself');
  const verdicts: Array<() => ConnectionVerdict> = [
    () => checkDirections(source, target, src, dst),
    () => checkMultiplicity(graph, findPort(source, src.portId), findPort(target, dst.portId), src, dst),
    () => {
      const from = findPort(source, src.portId);
      const to = findPort(target, dst.portId);
      if (!from || !to) return ACCEPT;
      const assignable = (options.isAssignable ?? defaultIsAssignable)(from.dataType, to.dataType);
      return assignable ? ACCEPT : reject(`Type "${from.dataType}" is not assignable to "${to.dataType}"`);
    },
    () => checkGraphRules(graph, source, target, options),
    () => (custom ? custom(src, dst, graph) : ACCEPT),
  ];
  for (const run of verdicts) {
    const verdict = run();
    if (!verdict.ok) return verdict;
  }
  return ACCEPT;
};
