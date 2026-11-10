// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PortSpec } from '@atomos-web/structura-core';
import type { NodeTypeDefinition } from './node-type.types.js';

/** Per-canvas registry of workflow node types. */
export interface NodeTypeRegistry {
  /** Registers (or replaces) a node type. Returns a function that unregisters it. */
  readonly register: (definition: NodeTypeDefinition) => () => void;
  readonly get: (type: string) => NodeTypeDefinition | undefined;
  readonly has: (type: string) => boolean;
  readonly list: () => readonly NodeTypeDefinition[];
  /** Resolves the ports of a node type for a given config (static array or config function). */
  readonly resolvePorts: (type: string, config: Readonly<Record<string, unknown>>) => readonly PortSpec[];
}

const assertDefinition = (definition: NodeTypeDefinition): void => {
  if (!definition.type || definition.type.trim().length === 0) {
    throw new Error('NodeTypeDefinition.type must be a non-empty string');
  }
  if (typeof definition.ports !== 'function' && !Array.isArray(definition.ports)) {
    throw new Error(`NodeTypeDefinition '${definition.type}' must declare ports as an array or a function`);
  }
};

const assertUniquePorts = (type: string, ports: readonly PortSpec[]): readonly PortSpec[] => {
  const seen = new Set<string>();
  ports.forEach(port => {
    if (seen.has(port.id)) throw new Error(`Node type '${type}' declares duplicate port id '${port.id}'`);
    seen.add(port.id);
  });
  return ports;
};

export const createNodeTypeRegistry = function(): NodeTypeRegistry {
  const definitions = new Map<string, NodeTypeDefinition>();

  const register = (definition: NodeTypeDefinition): (() => void) => {
    assertDefinition(definition);
    definitions.set(definition.type, definition);
    return () => {
      if (definitions.get(definition.type) === definition) definitions.delete(definition.type);
    };
  };

  const resolvePorts = (type: string, config: Readonly<Record<string, unknown>>): readonly PortSpec[] => {
    const definition = definitions.get(type);
    if (!definition) return [];
    const ports = typeof definition.ports === 'function' ? definition.ports(config) : definition.ports;
    return assertUniquePorts(type, ports);
  };

  return {
    register,
    resolvePorts,
    get: type => definitions.get(type),
    has: type => definitions.has(type),
    list: () => Array.from(definitions.values()),
  };
};
