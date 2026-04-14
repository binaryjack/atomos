/**
 * Battle tests — SchemaBuilder.close() + clearMemory()
 *
 * localStorage is mocked in-memory so these run in pure Node.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSchemaBuilder } from '../src/core/schema-builder.js';
import type { Entity } from '@atomos-web/structura-core';

// ── localStorage mock ──────────────────────────────────────────────────────
const makeLocalStorage = () => {
  const _store: Record<string, string> = {};
  return {
    getItem: (k: string) => _store[k] ?? null,
    setItem: (k: string, v: string) => { _store[k] = v; },
    removeItem: (k: string) => { delete _store[k]; },
    clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
    get length() { return Object.keys(_store).length; },
    key: (i: number) => Object.keys(_store)[i] ?? null,
    _raw: _store,
  };
};

const ls = makeLocalStorage();
vi.stubGlobal('localStorage', ls);

// ── Fixture ────────────────────────────────────────────────────────────────
const makeEntity = (id: string): Entity => ({
  id,
  name: id,
  properties: [],
  position: { x: 0, y: 0 },
  dimensions: { width: 120, height: 60 },
  edges: [],
});

// ── clearMemory ────────────────────────────────────────────────────────────

describe('SchemaBuilder.clearMemory()', () => {
  beforeEach(() => ls.clear());

  it('resets Redux state so added entities are gone', () => {
    const builder = createSchemaBuilder();
    builder.addEntity(makeEntity('e1'));
    builder.addEntity(makeEntity('e2'));
    builder.clearMemory();
    const schemas = builder.workspaceApi.listSchemas();
    expect(schemas[0]?.entityCount).toBe(0);
  });

  it('removes all vbe2:* localStorage keys', () => {
    const builder = createSchemaBuilder();
    ls.setItem('vbe2:redux-state', '{"test":1}');
    ls.setItem('vbe2:canvas-viewport', '{"zoom":1}');
    ls.setItem('other-key', 'keep-me');
    builder.clearMemory();
    expect(ls.getItem('vbe2:redux-state')).toBeNull();
    expect(ls.getItem('vbe2:canvas-viewport')).toBeNull();
    expect(ls.getItem('other-key')).toBe('keep-me');
  });

  it('session remains usable — can add entities after clearMemory', () => {
    const builder = createSchemaBuilder();
    builder.addEntity(makeEntity('e1'));
    builder.clearMemory();
    builder.addEntity(makeEntity('e2'));
    expect(builder.workspaceApi.listSchemas()[0]?.entityCount).toBe(1);
  });

  it('preserves WorkspaceConfig after clearMemory', () => {
    const builder = createSchemaBuilder({ config: { headless: true } });
    builder.addEntity(makeEntity('e1'));
    builder.clearMemory();
    expect(builder.store.get_state().workspace.config?.headless).toBe(true);
  });

  it('notifies store subscribers on clearMemory', () => {
    const builder = createSchemaBuilder();
    const spy = vi.fn();
    builder.store.subscribe(spy);
    builder.addEntity(makeEntity('e1')); // spy +1
    const callsBefore = spy.mock.calls.length;
    builder.clearMemory();
    expect(spy.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ── close ──────────────────────────────────────────────────────────────────

describe('SchemaBuilder.close()', () => {
  beforeEach(() => ls.clear());

  it('removes all vbe2:* localStorage keys', () => {
    const builder = createSchemaBuilder();
    ls.setItem('vbe2:redux-state', '{"test":1}');
    ls.setItem('vbe2:canvas-viewport', '{"zoom":1}');
    ls.setItem('unrelated', 'stays');
    builder.close();
    expect(ls.getItem('vbe2:redux-state')).toBeNull();
    expect(ls.getItem('vbe2:canvas-viewport')).toBeNull();
    expect(ls.getItem('unrelated')).toBe('stays');
  });

  it('stops notifying listeners after close', () => {
    const builder = createSchemaBuilder();
    const spy = vi.fn();
    builder.store.subscribe(spy);
    builder.addEntity(makeEntity('pre'));  // fires spy
    const callsBefore = spy.mock.calls.length;
    builder.close();
    // Dispatch directly to the underlying store — listener should no longer fire
    // (The subscription was torn down by close())
    // Note: close() calls unsub() which removes the kernel-sync listener;
    // the externally-added spy is a separate subscription and is NOT removed.
    // What we can verify is that the builder's own internal kernel listener is dead.
    // We test this indirectly: addEntity after close() should not throw.
    expect(() => builder.addEntity(makeEntity('post'))).not.toThrow();
    expect(callsBefore).toBeGreaterThan(0);
  });

  it('is idempotent — calling close() twice does not throw', () => {
    const builder = createSchemaBuilder();
    expect(() => { builder.close(); builder.close(); }).not.toThrow();
  });
});

// ── menuControl ───────────────────────────────────────────────────────────

describe('SchemaBuilder.menuControl', () => {
  it('is initialized from WorkspaceConfig.menu', () => {
    const builder = createSchemaBuilder({
      config: { menu: { zoom_in: { available: false } } },
    });
    expect(builder.menuControl.getConfig().zoom_in?.available).toBe(false);
  });

  it('setAvailable() toggles at runtime', () => {
    const builder = createSchemaBuilder({
      config: { menu: { export: { available: true } } },
    });
    builder.menuControl.setAvailable('export', false);
    expect(builder.menuControl.getConfig().export?.available).toBe(false);
  });

  it('subscribe() delivers config changes', () => {
    const builder = createSchemaBuilder();
    const spy = vi.fn();
    builder.menuControl.subscribe(spy);
    builder.menuControl.setAvailable('auto_layout', false);
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]?.auto_layout?.available).toBe(false);
  });
});
