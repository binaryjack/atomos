// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ConnectionConstraint, TopologicalRules } from '@atomos-web/structura-core';
import {
  ACCEPT, type ConnectionGraph, type ConnectionGraphNode, type ConnectionVerdict, reject,
} from './connection-validation.types.js';

/** True when a directed path already leads `fromId` -> ... -> `toId`. */
export const hasPath = (graph: ConnectionGraph, fromId: string, toId: string): boolean => {
  const adjacency = new Map<string, string[]>();
  graph.edges.forEach(edge => {
    const next = adjacency.get(edge.source.nodeId) ?? [];
    next.push(edge.target.nodeId);
    adjacency.set(edge.source.nodeId, next);
  });
  const visited = new Set<string>();
  const stack = [fromId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === toId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    (adjacency.get(current) ?? []).forEach(n => stack.push(n));
  }
  return false;
};

const ruleFor = (rules: TopologicalRules, type: string): ConnectionConstraint | undefined =>
  rules.rulesByNodeType[type] ?? rules.defaultConstraint;

const checkAllowed = (sourceType: string, targetType: string, rules: TopologicalRules): ConnectionVerdict => {
  const sourceRule = ruleFor(rules, sourceType);
  const targetRule = ruleFor(rules, targetType);
  if (sourceRule && sourceRule.allowedTargets !== '*' && !sourceRule.allowedTargets.includes(targetType)) {
    return reject(`Node type "${sourceType}" may not connect to node type "${targetType}"`);
  }
  if (targetRule && targetRule.allowedSources !== '*' && !targetRule.allowedSources.includes(sourceType)) {
    return reject(`Node type "${targetType}" does not accept node type "${sourceType}" as a source`);
  }
  return ACCEPT;
};

/** Applies node-type topology rules (allow-lists and degree bounds). */
export const checkTopology = (
  source: ConnectionGraphNode, target: ConnectionGraphNode, graph: ConnectionGraph, rules: TopologicalRules
): ConnectionVerdict => {
  const sourceType = source.nodeType || 'default';
  const targetType = target.nodeType || 'default';
  const allowed = checkAllowed(sourceType, targetType, rules);
  if (!allowed.ok) return allowed;
  const maxOut = ruleFor(rules, sourceType)?.maxOutgoing;
  if (maxOut !== undefined && graph.edges.filter(e => e.source.nodeId === source.id).length >= maxOut) {
    return reject(`Node type "${sourceType}" reached its maximum of ${maxOut} outgoing connections`);
  }
  const maxIn = ruleFor(rules, targetType)?.maxIncoming;
  if (maxIn !== undefined && graph.edges.filter(e => e.target.nodeId === target.id).length >= maxIn) {
    return reject(`Node type "${targetType}" reached its maximum of ${maxIn} incoming connections`);
  }
  return ACCEPT;
};
