/**
 * Battle tests — SchemaGraphKernel (headless, pure)
 */
import { describe, it, expect, vi } from 'vitest';
import { createSchemaGraphKernel } from '../src/core/create-schema-graph-kernel.js';
import type { Entity, LinkProps, Property } from '@atomos-web/structura-core';

// ── Fixtures ───────────────────────────────────────────────────────────────
const prop = (key: string): Property => ({
  key,
  label: key,
  value: '',
  dataType: 'string',
  componentType: 'input',
});

const makeEntity = (id: string, nodeType = 'table', props: string[] = []): Entity => ({
  id,
  name: id,
  nodeType,
  properties: props.map(p => prop(p)),
  position: { x: 0, y: 0 },
  dimensions: { width: 120, height: 60 },
  edges: [],
});

const makeLink = (id: string, left: string, right: string): LinkProps => ({
  id,
  leftEntityId: left,
  rightEntityId: right,
  leftCardinality: '1',
  rightCardinality: '*',
  renderType: 'bezier',
  leftAnchorId: 'right',
  rightAnchorId: 'left',
});

// ── Tests ──────────────────────────────────────────────────────────────────
describe('createSchemaGraphKernel', () => {
  // ── State access ──
  it('starts empty', () => {
    const k = createSchemaGraphKernel();
    const s = k.getSnapshot();
    expect(Object.keys(s.entities)).toHaveLength(0);
    expect(Object.keys(s.links)).toHaveLength(0);
  });

  it('initialState is honoured', () => {
    const e = makeEntity('e1');
    const k = createSchemaGraphKernel({ entities: { e1: e }, links: {} });
    expect(k.getSnapshot().entities['e1']?.id).toBe('e1');
  });

  // ── addEntity ──
  it('addEntity stores entity', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    expect(k.getSnapshot().entities['e1']).toBeDefined();
  });

  it('addEntity fires subscribers', () => {
    const k = createSchemaGraphKernel();
    const cb = vi.fn();
    k.subscribe(cb);
    k.addEntity(makeEntity('e1'));
    expect(cb).toHaveBeenCalledOnce();
  });

  // ── updateEntity ──
  it('updateEntity patches name', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    k.updateEntity('e1', { name: 'Renamed' });
    expect(k.getSnapshot().entities['e1']?.name).toBe('Renamed');
  });

  it('updateEntity is a no-op for unknown id', () => {
    const k = createSchemaGraphKernel();
    const cb = vi.fn();
    k.subscribe(cb);
    k.updateEntity('ghost', { name: 'X' });
    expect(cb).not.toHaveBeenCalled();
  });

  // ── removeEntity ──
  it('removeEntity deletes entity', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    k.removeEntity('e1');
    expect(k.getSnapshot().entities['e1']).toBeUndefined();
  });

  it('removeEntity cascades connected links', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    k.addEntity(makeEntity('e2'));
    k.addLink(makeLink('l1', 'e1', 'e2'));
    k.removeEntity('e1');
    expect(k.getSnapshot().links['l1']).toBeUndefined();
  });

  // ── addLink / updateLink / removeLink ──
  it('addLink stores link', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    k.addEntity(makeEntity('e2'));
    k.addLink(makeLink('l1', 'e1', 'e2'));
    expect(k.getSnapshot().links['l1']).toBeDefined();
  });

  it('updateLink patches cardinality', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    k.addEntity(makeEntity('e2'));
    k.addLink(makeLink('l1', 'e1', 'e2'));
    k.updateLink('l1', { rightCardinality: '1' });
    expect(k.getSnapshot().links['l1']?.rightCardinality).toBe('1');
  });

  it('removeLink deletes link', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('e1'));
    k.addEntity(makeEntity('e2'));
    k.addLink(makeLink('l1', 'e1', 'e2'));
    k.removeLink('l1');
    expect(k.getSnapshot().links['l1']).toBeUndefined();
  });

  // ── subscribe / unsubscribe ──
  it('unsubscribed listener is not called', () => {
    const k = createSchemaGraphKernel();
    const cb = vi.fn();
    const unsub = k.subscribe(cb);
    unsub();
    k.addEntity(makeEntity('e1'));
    expect(cb).not.toHaveBeenCalled();
  });

  // ── getParents / getChildren ──
  it('getChildren returns direct children', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('parent'));
    k.addEntity(makeEntity('child'));
    k.addLink(makeLink('l1', 'parent', 'child'));
    const children = k.getChildren('parent');
    expect(children.map(e => e.id)).toContain('child');
  });

  it('getParents returns direct parents', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('parent'));
    k.addEntity(makeEntity('child'));
    k.addLink(makeLink('l1', 'parent', 'child'));
    const parents = k.getParents('child');
    expect(parents.map(e => e.id)).toContain('parent');
  });

  // ── getTopologicalSort ──
  it('getTopologicalSort returns all entity ids', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('A'));
    k.addEntity(makeEntity('B'));
    k.addEntity(makeEntity('C'));
    k.addLink(makeLink('l1', 'A', 'B'));
    k.addLink(makeLink('l2', 'B', 'C'));
    const sorted = k.getTopologicalSort();
    expect(sorted).toHaveLength(3);
    expect(sorted.indexOf('A')).toBeLessThan(sorted.indexOf('B'));
    expect(sorted.indexOf('B')).toBeLessThan(sorted.indexOf('C'));
  });

  // ── detectCycles ──
  it('detectCycles returns empty for acyclic graph', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('A'));
    k.addEntity(makeEntity('B'));
    k.addLink(makeLink('l1', 'A', 'B'));
    expect(k.detectCycles()).toHaveLength(0);
  });

  it('detectCycles finds a cycle', () => {
    const k = createSchemaGraphKernel();
    k.addEntity(makeEntity('A'));
    k.addEntity(makeEntity('B'));
    k.addEntity(makeEntity('C'));
    k.addLink(makeLink('l1', 'A', 'B'));
    k.addLink(makeLink('l2', 'B', 'C'));
    k.addLink(makeLink('l3', 'C', 'A'));
    expect(k.detectCycles().length).toBeGreaterThan(0);
  });

  // ── canConnect / registerValidationRule ──
  // kernel is default-allow: any connection is allowed when no rules are present.
  // Rules are an ALLOW-LIST: once any rule is registered, only matching pairs are allowed.
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
    k.registerValidationRule({ sourceType: 'table', targetType: 'view' }); // wrong direction
    expect(k.canConnect('A', 'B')).toBe(false);
  });

  it('canConnect returns false for unknown entity ids', () => {
    const k = createSchemaGraphKernel();
    expect(k.canConnect('ghost1', 'ghost2')).toBe(false);
  });

  // ── extractJsonSchema ──
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
    const k = createSchemaGraphKernel();
    const schema = k.extractJsonSchema('ghost');
    // Implementation returns {} for unknown entity
    expect(schema).toEqual({});
  });
});
