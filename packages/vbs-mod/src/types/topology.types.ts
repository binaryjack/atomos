export interface ConnectionConstraint {
  /** Array of permitted source nodeTypes, or '*' for any. */
  readonly allowedSources: readonly string[] | '*';
  /** Array of permitted target nodeTypes, or '*' for any. */
  readonly allowedTargets: readonly string[] | '*';
  /** Maximum number of incoming links allowed. Undefined means no limit. */
  readonly maxIncoming?: number;
  /** Maximum number of outgoing links allowed. Undefined means no limit. */
  readonly maxOutgoing?: number;
}

export interface TopologicalRules {
  /** Map of nodeType to its connection constraint rules. */
  readonly rulesByNodeType: Readonly<Record<string, ConnectionConstraint>>;
  /** Fallback rules if a nodeType is not explicitly defined in the map. */
  readonly defaultConstraint?: ConnectionConstraint;
}
