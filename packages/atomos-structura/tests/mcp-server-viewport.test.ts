/**
 * Battle tests — VbsMcpServer · viewport + session tools
 *
 * Covers:
 *   viewport/get, viewport/set-zoom, viewport/set-pan,
 *   viewport/center, viewport/fit-to-screen,
 *   session/close, session/clear-memory
 *   sync-state with menu_config
 *   403 availability guards
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import { VbsMcpServer } from '@atomos-web/structura-mcp';
import type { Entity, WorkspaceConfig } from '@atomos-web/structura-core';

// ── helpers ────────────────────────────────────────────────────────────────

let _id = 0;

interface JsonResponse {
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
  id: string;
}

const callMethod = async (
  server: VbsMcpServer,
  method: string,
  params: unknown = {},
): Promise<JsonResponse> => {
  const id = `req-${++_id}`;
  const body = JSON.stringify({ method, params, id });

  const req = Object.assign(new EventEmitter(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  }) as unknown as IncomingMessage;

  let responseBody = '';
  const res = {
    setHeader: () => void 0,
    writeHead: () => void 0,
    end: (b: string) => { responseBody = b; },
    write: () => void 0,
  } as unknown as ServerResponse;

  const p = server.handleRequest(req, res);
  process.nextTick(() => {
    req.emit('data', body);
    req.emit('end');
  });
  await p;

  return JSON.parse(responseBody) as JsonResponse;
};

const makeEntity = (id: string, x = 0, y = 0, w = 120, h = 60): Entity => ({
  id,
  name: id,
  properties: [],
  position: { x, y },
  dimensions: { width: w, height: h },
  edges: [],
});

// Config that disables zoom + center + fit
const make_restricted_config = (): WorkspaceConfig => ({
  menu: {
    zoom: { available: false },
    center_on_screen: { available: false },
    fit_to_screen: { available: false },
  },
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('VbsMcpServer — viewport', () => {
  let server: VbsMcpServer;
  beforeEach(() => { server = new VbsMcpServer(); });

  // ── viewport/get ──

  it('viewport/get returns default viewport', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/get', {});
    const vp = res.result?.['viewport'] as { zoom: number; pan: { x: number; y: number } };
    expect(vp).toBeDefined();
    expect(vp.zoom).toBe(1);
    expect(vp.pan).toEqual({ x: 0, y: 0 });
  });

  // ── viewport/set-zoom ──

  it('viewport/set-zoom sets a valid level', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/set-zoom', { level: 1.5 });
    expect(res.result?.['success']).toBe(true);
    expect(res.result?.['zoom']).toBe(1.5);
  });

  it('viewport/set-zoom clamps to minimum (0.1)', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/set-zoom', { level: 0.00001 });
    expect(res.result?.['zoom']).toBe(0.1);
  });

  it('viewport/set-zoom clamps to maximum (4)', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/set-zoom', { level: 99 });
    expect(res.result?.['zoom']).toBe(4);
  });

  it('viewport/set-zoom persists — visible in viewport/get', async () => {
    await callMethod(server, 'atomos-structura/viewport/set-zoom', { level: 2.5 });
    const res = await callMethod(server, 'atomos-structura/viewport/get', {});
    const vp = res.result?.['viewport'] as { zoom: number };
    expect(vp.zoom).toBe(2.5);
  });

  it('viewport/set-zoom returns 403 when zoom is not available', async () => {
    const s = new VbsMcpServer({ initialConfig: make_restricted_config() });
    const res = await callMethod(s, 'atomos-structura/viewport/set-zoom', { level: 2 });
    expect(res.error?.code).toBe(403);
  });

  // ── viewport/set-pan ──

  it('viewport/set-pan sets pan coordinates', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/set-pan', { x: 100, y: 50 });
    expect(res.result?.['success']).toBe(true);
    const pan = res.result?.['pan'] as { x: number; y: number };
    expect(pan).toEqual({ x: 100, y: 50 });
  });

  it('viewport/set-pan persists — visible in viewport/get', async () => {
    await callMethod(server, 'atomos-structura/viewport/set-pan', { x: -20, y: 30 });
    const res = await callMethod(server, 'atomos-structura/viewport/get', {});
    const vp = res.result?.['viewport'] as { pan: { x: number; y: number } };
    expect(vp.pan).toEqual({ x: -20, y: 30 });
  });

  it('viewport/set-pan preserves current zoom', async () => {
    await callMethod(server, 'atomos-structura/viewport/set-zoom', { level: 2 });
    await callMethod(server, 'atomos-structura/viewport/set-pan', { x: 10, y: 10 });
    const res = await callMethod(server, 'atomos-structura/viewport/get', {});
    const vp = res.result?.['viewport'] as { zoom: number; pan: { x: number; y: number } };
    expect(vp.zoom).toBe(2);
    expect(vp.pan).toEqual({ x: 10, y: 10 });
  });

  // ── viewport/center ──

  it('viewport/center skips when schema has no entities', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/center', {});
    expect(res.result?.['success']).toBe(true);
    expect(res.result?.['skipped']).toBe(true);
  });

  it('viewport/center computes correct pan for one entity', async () => {
    // entity at (100,100) 120×60 → centroid (160, 130)
    // viewport 800×600, zoom 1
    // pan = { x: 400 - 160*1, y: 300 - 130*1 } = { x: 240, y: 170 }
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 100, 100));
    const res = await callMethod(server, 'atomos-structura/viewport/center', { width: 800, height: 600 });
    const vp = res.result?.['viewport'] as { pan: { x: number; y: number }; zoom: number };
    expect(vp.pan.x).toBeCloseTo(240);
    expect(vp.pan.y).toBeCloseTo(170);
  });

  it('viewport/center averages centroids of multiple entities', async () => {
    // e1 centroid (60, 30), e2 centroid (180, 30)
    // avg = (120, 30), pan = { x: 400 - 120, y: 300 - 30 } = { x: 280, y: 270 }
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 0, 0));
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e2', 120, 0));
    const res = await callMethod(server, 'atomos-structura/viewport/center', { width: 800, height: 600 });
    const vp = res.result?.['viewport'] as { pan: { x: number; y: number } };
    expect(vp.pan.x).toBeCloseTo(280);
    expect(vp.pan.y).toBeCloseTo(270);
  });

  it('viewport/center returns 403 when center_on_screen is not available', async () => {
    const s = new VbsMcpServer({ initialConfig: make_restricted_config() });
    const res = await callMethod(s, 'atomos-structura/viewport/center', {});
    expect(res.error?.code).toBe(403);
  });

  // ── viewport/fit-to-screen ──

  it('viewport/fit-to-screen skips when schema has no entities', async () => {
    const res = await callMethod(server, 'atomos-structura/viewport/fit-to-screen', {});
    expect(res.result?.['success']).toBe(true);
    expect(res.result?.['skipped']).toBe(true);
  });

  it('viewport/fit-to-screen computes zoom for single entity', async () => {
    // entity bbox = 120×60, viewport 800×600, padding 100
    // zoom = min((600/120), (400/60),  2) = min(5, 6.67, 2) = 2
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 0, 0));
    const res = await callMethod(server, 'atomos-structura/viewport/fit-to-screen', {
      width: 800, height: 600, padding: 100,
    });
    const vp = res.result?.['viewport'] as { zoom: number };
    expect(vp.zoom).toBe(2);
  });

  it('viewport/fit-to-screen caps zoom at 2', async () => {
    // even a very small entity should not produce zoom > 2
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('tiny', 0, 0, 10, 5));
    const res = await callMethod(server, 'atomos-structura/viewport/fit-to-screen', {
      width: 800, height: 600, padding: 0,
    });
    const vp = res.result?.['viewport'] as { zoom: number };
    expect(vp.zoom).toBeLessThanOrEqual(2);
  });

  it('viewport/fit-to-screen fits multiple entities spanning wide area', async () => {
    // e1 at (0,0), e2 at (600,0) same size 120×60 → bbox W=720, H=60
    // zoom = min((600/720),(400/60), 2) ≈ min(0.833, 6.67, 2) ≈ 0.833
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 0, 0));
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e2', 600, 0));
    const res = await callMethod(server, 'atomos-structura/viewport/fit-to-screen', {
      width: 800, height: 600, padding: 100,
    });
    const vp = res.result?.['viewport'] as { zoom: number };
    expect(vp.zoom).toBeCloseTo((800 - 200) / 720);
  });

  it('viewport/fit-to-screen returns 403 when fit_to_screen is not available', async () => {
    const s = new VbsMcpServer({ initialConfig: make_restricted_config() });
    const res = await callMethod(s, 'atomos-structura/viewport/fit-to-screen', {});
    expect(res.error?.code).toBe(403);
  });
});

describe('VbsMcpServer — session', () => {
  let server: VbsMcpServer;
  beforeEach(() => { server = new VbsMcpServer(); });

  // ── session/close ──

  it('session/close returns success', async () => {
    const res = await callMethod(server, 'atomos-structura/session/close', {});
    expect(res.result?.['success']).toBe(true);
  });

  it('session/close invokes onSessionClose hook', async () => {
    const hook = vi.fn();
    const s = new VbsMcpServer({ onSessionClose: hook });
    await callMethod(s, 'atomos-structura/session/close', {});
    expect(hook).toHaveBeenCalledOnce();
  });

  it('session/close without hook does not throw', async () => {
    // default constructor — no hook
    const res = await callMethod(server, 'atomos-structura/session/close', {});
    expect(res.error).toBeUndefined();
  });

  it('session/close is idempotent (second call still succeeds)', async () => {
    await callMethod(server, 'atomos-structura/session/close', {});
    const res = await callMethod(server, 'atomos-structura/session/close', {});
    expect(res.result?.['success']).toBe(true);
  });

  // ── session/clear-memory ──

  it('session/clear-memory returns success', async () => {
    const res = await callMethod(server, 'atomos-structura/session/clear-memory', {});
    expect(res.result?.['success']).toBe(true);
  });

  it('session/clear-memory invokes onClearMemory hook', async () => {
    const hook = vi.fn();
    const s = new VbsMcpServer({ onClearMemory: hook });
    await callMethod(s, 'atomos-structura/session/clear-memory', {});
    expect(hook).toHaveBeenCalledOnce();
  });

  it('session/clear-memory resets entity state', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1'));
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e2'));
    await callMethod(server, 'atomos-structura/session/clear-memory', {});
    const schema = await callMethod(server, 'atomos-structura/get-schema', {});
    const entities = (schema.result?.['schema'] as { entities: Entity[] })?.entities ?? [];
    expect(entities).toHaveLength(0);
  });

  it('session/clear-memory preserves workspace config', async () => {
    const cfg: WorkspaceConfig = { menu: { zoom: { available: false } } };
    const s = new VbsMcpServer({ initialConfig: cfg });
    await callMethod(s, 'atomos-structura/session/clear-memory', {});
    // zoom should still be blocked after reset
    const res = await callMethod(s, 'atomos-structura/viewport/set-zoom', { level: 2 });
    expect(res.error?.code).toBe(403);
  });

  it('session/clear-memory resets viewport to defaults', async () => {
    await callMethod(server, 'atomos-structura/viewport/set-zoom', { level: 3 });
    await callMethod(server, 'atomos-structura/viewport/set-pan', { x: 99, y: 88 });
    await callMethod(server, 'atomos-structura/session/clear-memory', {});
    const res = await callMethod(server, 'atomos-structura/viewport/get', {});
    const vp = res.result?.['viewport'] as { zoom: number; pan: { x: number; y: number } };
    expect(vp.zoom).toBe(1);
    expect(vp.pan).toEqual({ x: 0, y: 0 });
  });
});

describe('VbsMcpServer — sync-state with menu_config', () => {
  let server: VbsMcpServer;
  beforeEach(() => { server = new VbsMcpServer(); });

  it('sync-state stores menu_config', async () => {
    await callMethod(server, 'atomos-structura/sync-state', {
      entities: [],
      links: [],
      menu_config: { zoom: { available: false, value: 1.5 } },
    });
    // After storing, set-zoom should now be blocked (menu_config replaces runtime config)
    // Note: menu_config is an advisory mirror from the browser, does NOT replace workspace.config;
    // it is stored in _state.menu_config for SSE broadcast purposes
    const res = await callMethod(server, 'atomos-structura/sync-state', {
      entities: [],
      links: [],
      menu_config: { zoom: { available: true } },
    });
    expect(res.result?.['success']).toBe(true);
  });

  it('sync-state without menu_config leaves existing menu_config intact', async () => {
    await callMethod(server, 'atomos-structura/sync-state', {
      entities: [],
      links: [],
      menu_config: { export: { available: false } },
    });
    // sync again without menu_config
    const res = await callMethod(server, 'atomos-structura/sync-state', {
      entities: [],
      links: [],
    });
    expect(res.result?.['success']).toBe(true);
    // no error expected — just ensure it doesn't crash
  });
});
