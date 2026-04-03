import type { TopologicalRules } from '@atomos/structura-core';

export interface TopologicalEntity {
  readonly id: string;
  readonly nodeType?: string;
}

export interface TopologicalLink {
  readonly sourceEntityId: string;
  readonly targetEntityId: string;
}

export interface ConnectionValidationResult {
  readonly isValid: boolean;
  readonly reason?: string;
}

export const validateTopologicalConnection = function(
  source: TopologicalEntity,
  target: TopologicalEntity,
  existingLinks: readonly TopologicalLink[],
  rules?: TopologicalRules
): ConnectionValidationResult {
  // Disallow connecting to self
  if (source.id === target.id) {
    return { isValid: false, reason: 'Cannot connect an entity to itself.' };
  }

  // Find existing connection to avoid duplicate edges between same two nodes if we want to restrict it
  // (Optional: but typical in DAG flows unless multiple edge ports are explicitly allowed)
  const isDuplicate = existingLinks.some(
    l => l.sourceEntityId === source.id && l.targetEntityId === target.id
  );
  if (isDuplicate) {
    // Depending on DAG engine, duplicate links might be disallowed
    return { isValid: false, reason: 'Entities are already connected.' };
  }

  if (!rules) {
    // If no rules defined, allow any generic connection
    return { isValid: true };
  }

  const sourceType = source.nodeType || 'default';
  const targetType = target.nodeType || 'default';

  const sourceRule = rules.rulesByNodeType[sourceType] || rules.defaultConstraint;
  const targetRule = rules.rulesByNodeType[targetType] || rules.defaultConstraint;

  // Validate Source's allowed targets
  if (sourceRule && sourceRule.allowedTargets !== '*') {
    if (!sourceRule.allowedTargets.includes(targetType)) {
      return { isValid: false, reason: `'${sourceType}' is not allowed to connect to '${targetType}'` };
    }
  }

  // Validate Target's allowed sources
  if (targetRule && targetRule.allowedSources !== '*') {
    if (!targetRule.allowedSources.includes(sourceType)) {
      return { isValid: false, reason: `'${targetType}' does not accept connections from '${sourceType}'` };
    }
  }

  // Validate outgoing bounds for source
  if (sourceRule && sourceRule.maxOutgoing !== undefined) {
    const outgoingCount = existingLinks.filter(l => l.sourceEntityId === source.id).length;
    if (outgoingCount >= sourceRule.maxOutgoing) {
      return { isValid: false, reason: `'${sourceType}' has reached maximum outgoing connections (${sourceRule.maxOutgoing})` };
    }
  }

  // Validate incoming bounds for target
  if (targetRule && targetRule.maxIncoming !== undefined) {
    const incomingCount = existingLinks.filter(l => l.targetEntityId === target.id).length;
    if (incomingCount >= targetRule.maxIncoming) {
      return { isValid: false, reason: `'${targetType}' has reached maximum incoming connections (${targetRule.maxIncoming})` };
    }
  }

  // Check DAG acyclic nature (Cycle detection) - simplified depth first search
  if (createsCycle(source.id, target.id, existingLinks)) {
    return { isValid: false, reason: 'Connection would create a cyclical graph.' };
  }

  return { isValid: true };
};

/**
 * Validates if adding an edge from source to target creates a cycle.
 */
const createsCycle = function(
  sourceId: string,
  targetId: string,
  links: readonly TopologicalLink[]
): boolean {
  // Build a fast adjacency list
  const adj = new Map<string, string[]>();
  for (const l of links) {
    const targets = adj.get(l.sourceEntityId) || [];
    targets.push(l.targetEntityId);
    adj.set(l.sourceEntityId, targets);
  }

  // We are proposing edge sourceId -> targetId
  // The only way this creates a cycle is if there is ALREADY a path from targetId -> sourceId
  
  const visited = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === sourceId) {
      return true; // Found a path back to source, adding this link would make a cycle!
    }
    
    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = adj.get(current) || [];
      for (const n of neighbors) {
        stack.push(n);
      }
    }
  }

  return false;
};
