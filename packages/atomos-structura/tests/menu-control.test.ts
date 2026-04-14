/**
 * Battle tests — createMenuControl
 *
 * Covers: init from WorkspaceMenuConfig, setAvailable, setValue,
 * getConfig, subscribe/unsubscribe, isolation between calls.
 */
import { describe, it, expect, vi } from 'vitest';
import { createMenuControl } from '../src/core/create-menu-control.js';
import type { WorkspaceMenuConfig } from '@atomos-web/structura-core';

// ── helpers ────────────────────────────────────────────────────────────────

const defaultConfig = (): WorkspaceMenuConfig => ({
  zoom_in: { available: true },
  zoom_out: { available: true },
  export: { available: false },
});

// ── initialization ─────────────────────────────────────────────────────────

describe('createMenuControl — init', () => {
  it('getConfig returns empty object when no initial config', () => {
    const mc = createMenuControl();
    expect(mc.getConfig()).toEqual({});
  });

  it('getConfig reflects provided initial config', () => {
    const mc = createMenuControl(defaultConfig());
    expect(mc.getConfig().export?.available).toBe(false);
    expect(mc.getConfig().zoom_in?.available).toBe(true);
  });

  it('initial config object is not mutated by control', () => {
    const init: WorkspaceMenuConfig = { zoom_in: { available: true } };
    const mc = createMenuControl(init);
    mc.setAvailable('zoom_in', false);
    expect(init.zoom_in?.available).toBe(true);
  });
});

// ── setAvailable ───────────────────────────────────────────────────────────

describe('createMenuControl — setAvailable', () => {
  it('sets available=false on an existing item', () => {
    const mc = createMenuControl(defaultConfig());
    mc.setAvailable('zoom_in', false);
    expect(mc.getConfig().zoom_in?.available).toBe(false);
  });

  it('sets available=true on an item that was false', () => {
    const mc = createMenuControl(defaultConfig());
    mc.setAvailable('export', true);
    expect(mc.getConfig().export?.available).toBe(true);
  });

  it('creates the item when it did not exist', () => {
    const mc = createMenuControl();
    mc.setAvailable('auto_layout', false);
    expect(mc.getConfig().auto_layout?.available).toBe(false);
  });

  it('preserves existing value when toggling available', () => {
    const init: WorkspaceMenuConfig = { zoom: { available: true, value: 1.5 } };
    const mc = createMenuControl(init);
    mc.setAvailable('zoom', false);
    const cfg = mc.getConfig().zoom as { available: boolean; value?: number };
    expect(cfg.available).toBe(false);
    expect(cfg.value).toBe(1.5);
  });

  it('does not mutate previous getConfig snapshots', () => {
    const mc = createMenuControl({ zoom_in: { available: true } });
    const snap1 = mc.getConfig();
    mc.setAvailable('zoom_in', false);
    // snap1 was taken before the mutation — it should not change reference-identity values
    expect(snap1.zoom_in?.available).toBe(true);
  });
});

// ── setValue ───────────────────────────────────────────────────────────────

describe('createMenuControl — setValue', () => {
  it('sets zoom value when zoom item exists', () => {
    const mc = createMenuControl({ zoom: { available: true } });
    mc.setValue('zoom', 2.5);
    const cfg = mc.getConfig().zoom as { available: boolean; value?: number };
    expect(cfg.value).toBe(2.5);
  });

  it('creates zoom item with value when not present', () => {
    const mc = createMenuControl();
    mc.setValue('zoom', 0.8);
    const cfg = mc.getConfig().zoom as { available: boolean; value?: number };
    expect(cfg.value).toBe(0.8);
    expect(cfg.available).toBe(true);
  });

  it('preserves available flag when setting value', () => {
    const mc = createMenuControl({ zoom: { available: false } });
    mc.setValue('zoom', 1.0);
    const cfg = mc.getConfig().zoom as { available: boolean; value?: number };
    expect(cfg.available).toBe(false);
    expect(cfg.value).toBe(1.0);
  });
});

// ── subscribe / notify ─────────────────────────────────────────────────────

describe('createMenuControl — subscribe', () => {
  it('notifies subscriber immediately when setAvailable is called', () => {
    const mc = createMenuControl();
    const spy = vi.fn();
    mc.subscribe(spy);
    mc.setAvailable('zoom_in', false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]?.zoom_in?.available).toBe(false);
  });

  it('notifies subscriber when setValue is called', () => {
    const mc = createMenuControl();
    const spy = vi.fn();
    mc.subscribe(spy);
    mc.setValue('zoom', 3.0);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not notify after unsubscribe', () => {
    const mc = createMenuControl();
    const spy = vi.fn();
    const unsub = mc.subscribe(spy);
    unsub();
    mc.setAvailable('zoom_out', false);
    expect(spy).not.toHaveBeenCalled();
  });

  it('notifies all active subscribers', () => {
    const mc = createMenuControl();
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    mc.subscribe(spy1);
    mc.subscribe(spy2);
    mc.setAvailable('import', false);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('only removes the unsubscribed listener', () => {
    const mc = createMenuControl();
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const unsub1 = mc.subscribe(spy1);
    mc.subscribe(spy2);
    unsub1();
    mc.setAvailable('export', true);
    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).toHaveBeenCalledTimes(1);
  });

  it('listener receives the current resolved config snapshot', () => {
    const mc = createMenuControl({ zoom_in: { available: true }, export: { available: false } });
    let received: WorkspaceMenuConfig | null = null;
    mc.subscribe(cfg => { received = cfg; });
    mc.setAvailable('export', true);
    expect(received).not.toBeNull();
    expect((received as WorkspaceMenuConfig).export?.available).toBe(true);
    expect((received as WorkspaceMenuConfig).zoom_in?.available).toBe(true);
  });
});

// ── multiple independent instances ─────────────────────────────────────────

describe('createMenuControl — isolation', () => {
  it('two instances do not share state', () => {
    const a = createMenuControl({ zoom_in: { available: true } });
    const b = createMenuControl({ zoom_in: { available: true } });
    a.setAvailable('zoom_in', false);
    expect(a.getConfig().zoom_in?.available).toBe(false);
    expect(b.getConfig().zoom_in?.available).toBe(true);
  });
});
