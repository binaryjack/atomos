// Copyright (c) 2026 Tadeop / Codernic AI Engineering.
// SPDX-License-Identifier: AGPL-3.0-or-later
/** Battle tests — SchemaGraphKernel state management (headless, pure). */
import { describe, expect, it, vi } from 'vitest';
import { createSchemaGraphKernel } from '../src/shared/core/create-schema-graph-kernel.js';
import { kernelWith, makeEntity } from './support/kernel-fixtures.js';

describe('createSchemaGraphKernel state', () => {
  it('starts empty', () => {
    const s = createSchemaGraphKernel().getSnapshot();
    expect(Object.keys(s.entities)).toHaveLength(0);
    expect(Object.keys(s.links)).toHaveLength(0);
  });

  it('initialState is honoured', () => {
    const k = createSchemaGraphKernel({ entities: { e1: makeEntity('e1') }, links: {} });
    expect(k.getSnapshot().entities['e1']?.id).toBe('e1');
  });

  it('addEntity stores entity', () => {
    expect(kernelWith(['e1']).getSnapshot().entities['e1']).toBeDefined();
  });

  it('addEntity fires subscribers', () => {
    const k = createSchemaGraphKernel();
    const cb = vi.fn();
    k.subscribe(cb);
    k.addEntity(makeEntity('e1'));
    expect(cb).toHaveBeenCalledOnce();
  });

  it('updateEntity patches name', () => {
    const k = kernelWith(['e1']);
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

  it('removeEntity deletes entity', () => {
    const k = kernelWith(['e1']);
    k.removeEntity('e1');
    expect(k.getSnapshot().entities['e1']).toBeUndefined();
  });

  it('removeEntity cascades connected links', () => {
    const k = kernelWith(['e1', 'e2'], [['l1', 'e1', 'e2']]);
    k.removeEntity('e1');
    expect(k.getSnapshot().links['l1']).toBeUndefined();
  });

  it('addLink stores link', () => {
    expect(kernelWith(['e1', 'e2'], [['l1', 'e1', 'e2']]).getSnapshot().links['l1']).toBeDefined();
  });

  it('updateLink patches cardinality', () => {
    const k = kernelWith(['e1', 'e2'], [['l1', 'e1', 'e2']]);
    k.updateLink('l1', { rightCardinality: '1' });
    expect(k.getSnapshot().links['l1']?.rightCardinality).toBe('1');
  });

  it('removeLink deletes link', () => {
    const k = kernelWith(['e1', 'e2'], [['l1', 'e1', 'e2']]);
    k.removeLink('l1');
    expect(k.getSnapshot().links['l1']).toBeUndefined();
  });

  it('unsubscribed listener is not called', () => {
    const k = createSchemaGraphKernel();
    const cb = vi.fn();
    const unsub = k.subscribe(cb);
    unsub();
    k.addEntity(makeEntity('e1'));
    expect(cb).not.toHaveBeenCalled();
  });
});
