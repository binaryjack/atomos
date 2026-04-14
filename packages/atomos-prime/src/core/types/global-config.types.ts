import type { DataType, TopologicalRules } from '@atomos-web/structura-core';

export interface GlobalConfig {
  readonly dataTypes: readonly DataType[];
  readonly defaultEntityWidth: number;
  readonly defaultEntityHeight: number;
  readonly theme: 'light' | 'dark';
  readonly topology?: TopologicalRules;
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  dataTypes: [
    'string', 'number', 'integer', 'float',
    'boolean', 'date', 'uuid', 'json', 'array', 'object',
  ],
  defaultEntityWidth: 260,
  defaultEntityHeight: 160,
  theme: 'dark',
  topology: {
    rulesByNodeType: {
      start: {
        allowedSources: [], // Nothing connects TO start
        allowedTargets: '*', // Start connects to anything
        maxIncoming: 0,
        maxOutgoing: 1
      },
      end: {
        allowedSources: '*', // Anything connects to end
        allowedTargets: [], // End connects to nothing
        maxOutgoing: 0
      },
      decision: {
        allowedSources: '*',
        allowedTargets: '*',
        maxOutgoing: 2 // Max True/False outputs
      }
    },
    defaultConstraint: {
      allowedSources: '*',
      allowedTargets: '*',
    }
  }
};
