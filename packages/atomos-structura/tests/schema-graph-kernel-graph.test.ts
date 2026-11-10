// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Battle tests — SchemaGraphKernel graph queries and validation rules (headless, pure). */
import { describe, expect, it } from 'vitest';
import { createSchemaGraphKernel } from '../src/shared/core/create-schema-graph-kernel.js';
import { kernelWith, makeEntity } from './support/kernel-fixtures.js';

describe('createSchemaGraphKernel graph queries', () => {
  it('getChildren returns direct children', () => {
    const k = kernelWith(['parent', 'child'], [['l1', 'parent', 'child']]);
    expect(k.getChildren('parent').map(e => e.id)).toContain('child');
  });

  it('getParents returns direct parents', () => {
    const k = kernelWith(['parent', 'child'], [['l1', 'parent', 'child']]);
    expect(k.getParents('child').map(e => e.id)).toContain('parent');
  });

  it('getTopologicalSort returns all entity ids', () => {
    const sorted = kernelWith(['A', 'B', 'C'], [['l1', 'A', 'B'], ['l2', 'B', 'C']]).getTopologicalSort();
    expect(sorted).toHaveLength(3);
    expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
    expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('C'));
  });

  it('detectCycles returns empty for acyclic graph', () => {
    expect(kernelWith(['A', 'B'], [['l1', 'A', 'B']]).detectCycles()).toHaveLength(0);
  });

  it('detectCycles finds a cycle', () => {
    const k = kernelWith(['A', 'B', 'C'], [['l1', 'A', 'B'], ['l2', 'B', 'C'], ['l3', 'C', 'A']]);
    expect(k.detectCycles().length).toBeGreaterThan(0);
  });

  // Kernel is default-allow; once any rule is registered rules become an allow-list.
  it('canConnect returns true when no rules are registered (default-allow)', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('A', 'table'));
    k.addEntity(makeEntity('B', 'view'));
    expect(k.canConnect('A', 'B')).toBe(true);
  });

  it('canConnect returns true for a matching allow-rule', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('A', 'table'));
    k.addEntity(makeEntity('B', 'view'));
    k.registerValidationRule({ sourceType: 'table', targetType: 'view' });
    expect(k.canConnect('A', 'B')).toBe(true);
  });

  it('canConnect returns false for an unmatched pair once rules exist', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('A', 'view'));
    k.addEntity(makeEntity('B', 'table'));
    k.registerValidationRule({ sourceType: 'table', targetType: 'view' });
    expect(k.canConnect('A', 'B')).toBe(false);
  });

  it('canConnect returns false for unknown entity ids', () => {
    expect(createSchemaGraphKernel().canConnect('ghost1', 'ghost2')).toBe(false);
  });

  it('extractJsonSchema returns object schema with properties', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('User', 'table', ['id', 'email']));
    const schema = k.extractJsonSchema('User');
    expect(schema['type']).toBe('object');
    const props = schema['properties'] as Record<string, unknown>;
    expect(props?.['id']).toBeDefined();
    expect(props?.['email']).toBeDefined();
  });

  it('extractJsonSchema returns empty object for unknown entity', () => {
    expect(createSchemaGraphKernel().extractJsonSchema('ghost')).toEqual({});
  });
});
