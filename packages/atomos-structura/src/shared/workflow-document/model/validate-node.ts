// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { COMPONENT_TYPES, DATA_TYPES } from '@atomos-web/structura-core';
import type { PortSpec, Property } from '@atomos-web/structura-core';
import type { WorkflowDocumentNode } from './document.types.js';
import {
  type ErrorSink, isRecord, oneOf, optionalBoolean, optionalRecord, optionalString,
  report, requireNumber, requireString,
} from './validation-primitives.js';

const DIRECTIONS = ['in', 'out'] as const;

export const validatePort = (sink: ErrorSink, raw: unknown, path: string): PortSpec | undefined => {
  if (!isRecord(raw)) {
    report(sink, path, 'invalid-type', `Expected a port object at ${path}`);
    return undefined;
  }
  const id = requireString(sink, raw, 'id', path);
  const dataType = requireString(sink, raw, 'dataType', path);
  const direction = oneOf(sink, raw['direction'], DIRECTIONS, `${path}/direction`);
  if (raw['direction'] === undefined) report(sink, `${path}/direction`, 'missing-field', 'Port direction is required');
  const label = optionalString(sink, raw, 'label', path);
  const required = optionalBoolean(sink, raw, 'required', path);
  const multiple = optionalBoolean(sink, raw, 'multiple', path);
  if (id === undefined || dataType === undefined || direction === undefined) return undefined;
  return {
    id, dataType, direction,
    ...(label !== undefined ? { label } : {}),
    ...(required !== undefined ? { required } : {}),
    ...(multiple !== undefined ? { multiple } : {}),
  };
};

export const validatePorts = (sink: ErrorSink, raw: unknown, path: string): PortSpec[] => {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    report(sink, path, 'invalid-type', `Expected an array of ports at ${path}`);
    return [];
  }
  const ports: PortSpec[] = [];
  const seen = new Set<string>();
  raw.forEach((item, index) => {
    const port = validatePort(sink, item, `${path}/${index}`);
    if (!port) return;
    if (seen.has(port.id)) report(sink, `${path}/${index}/id`, 'duplicate-id', `Duplicate port id '${port.id}'`);
    seen.add(port.id);
    ports.push(port);
  });
  return ports;
};

const validateProperty = (sink: ErrorSink, raw: unknown, path: string): Property | undefined => {
  if (!isRecord(raw)) {
    report(sink, path, 'invalid-type', `Expected a property object at ${path}`);
    return undefined;
  }
  const key = requireString(sink, raw, 'key', path);
  const dataType = oneOf(sink, raw['dataType'] ?? 'string', DATA_TYPES, `${path}/dataType`);
  const componentType = oneOf(sink, raw['componentType'] ?? 'input', COMPONENT_TYPES, `${path}/componentType`);
  const label = optionalString(sink, raw, 'label', path);
  if (key === undefined || dataType === undefined || componentType === undefined) return undefined;
  return { key, label: label ?? key, value: raw['value'], dataType, componentType };
};

const validateProperties = (sink: ErrorSink, raw: unknown, path: string): Property[] | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) {
    report(sink, path, 'invalid-type', `Expected an array at ${path}`);
    return undefined;
  }
  return raw.flatMap((item, index) => validateProperty(sink, item, `${path}/${index}`) ?? []);
};

const validatePoint = (sink: ErrorSink, raw: unknown, keys: readonly [string, string], path: string): [number, number] | undefined => {
  if (!isRecord(raw)) {
    report(sink, path, raw === undefined ? 'missing-field' : 'invalid-type', `Expected an object at ${path}`);
    return undefined;
  }
  const a = requireNumber(sink, raw, keys[0], path);
  const b = requireNumber(sink, raw, keys[1], path);
  return a === undefined || b === undefined ? undefined : [a, b];
};

const optionalErFields = (sink: ErrorSink, raw: Record<string, unknown>, path: string) => {
  const properties = validateProperties(sink, raw['properties'], `${path}/properties`);
  const shape = optionalString(sink, raw, 'shape', path);
  const color = optionalString(sink, raw, 'color', path);
  const description = optionalString(sink, raw, 'description', path);
  const collapsed = optionalBoolean(sink, raw, 'collapsed', path);
  return {
    ...(properties !== undefined ? { properties } : {}),
    ...(shape !== undefined ? { shape } : {}),
    ...(color !== undefined ? { color } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(collapsed !== undefined ? { collapsed } : {}),
  };
};

export const validateNode = (sink: ErrorSink, raw: unknown, path: string): WorkflowDocumentNode | undefined => {
  if (!isRecord(raw)) {
    report(sink, path, 'invalid-type', `Expected a node object at ${path}`);
    return undefined;
  }
  const id = requireString(sink, raw, 'id', path);
  const type = optionalString(sink, raw, 'type', path);
  const label = optionalString(sink, raw, 'label', path);
  const position = validatePoint(sink, raw['position'], ['x', 'y'], `${path}/position`);
  const size = validatePoint(sink, raw['size'], ['width', 'height'], `${path}/size`);
  const config = optionalRecord(sink, raw, 'config', path);
  const metadata = optionalRecord(sink, raw, 'metadata', path);
  const ports = validatePorts(sink, raw['ports'], `${path}/ports`);
  const er = optionalErFields(sink, raw, path);
  if (size !== undefined && (size[0] <= 0 || size[1] <= 0)) {
    report(sink, `${path}/size`, 'invalid-value', 'Node size must be strictly positive');
    return undefined;
  }
  if (id === undefined || position === undefined || size === undefined) return undefined;
  return {
    id, label: label ?? id, config, metadata, ports, ...er,
    ...(type !== undefined ? { type } : {}),
    position: { x: position[0], y: position[1] },
    size: { width: size[0], height: size[1] },
  };
};
