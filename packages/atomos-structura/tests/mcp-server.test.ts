/**
 * Battle tests — VbsMcpServer
 * 
 * Exercises all RPC methods via the public handleRequest() endpoint
 * using lightweight mock IncomingMessage / ServerResponse objects.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import { VbsMcpServer } from '@atomos-web/structura-mcp';
import type { Entity, LinkProps } from '@atomos-web/structura-core';

// ── Test helper ────────────────────────────────────────────────────────────
let _id = 0;

interface JsonResponse {
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
  id: string;
}

const callMethod = async (server: VbsMcpServer, method: string, params: unknown = {}): Promise<JsonResponse> => {
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

// ── Fixtures ───────────────────────────────────────────────────────────────
const makeEntity = (id: string, name = id): Entity => ({
  id,
  name,
  properties: [],
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
describe('VbsMcpServer', () => {
  let server: VbsMcpServer;
  beforeEach(() => { server = new VbsMcpServer(); });

  // ── Routing ──
  it('returns -32601 for unknown method', async () => {
    const res = await callMethod(server, 'unknown/method', {});
    expect(res.error?.code).toBe(-32601);
  });

  // ── Entity CRUD ──
  it('create-entity stores and returns entity', async () => {
    const res = await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 'User'));
    expect(res.result?.['success']).toBe(true);
  });

  it('get-entity returns stored entity', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 'User'));
    const res = await callMethod(server, 'atomos-structura/get-entity', { entityId: 'e1' });
    expect((res.result?.['entity'] as Entity | undefined)?.name).toBe('User');
  });

  it('get-entity returns 404 for missing id', async () => {
    const res = await callMethod(server, 'atomos-structura/get-entity', { entityId: 'nope' });
    expect(res.error?.code).toBe(404);
  });

  it('update-entity replaces entity', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1', 'Old'));
    await callMethod(server, 'atomos-structura/update-entity', makeEntity('e1', 'New'));
    const res = await callMethod(server, 'atomos-structura/get-entity', { entityId: 'e1' });
    expect((res.result?.['entity'] as Entity | undefined)?.name).toBe('New');
  });

  it('update-entity returns 404 for missing id', async () => {
    const res = await callMethod(server, 'atomos-structura/update-entity', makeEntity('ghost'));
    expect(res.error?.code).toBe(404);
  });

  it('delete-entity removes entity', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1'));
    await callMethod(server, 'atomos-structura/delete-entity', { entityId: 'e1' });
    const res = await callMethod(server, 'atomos-structura/get-entity', { entityId: 'e1' });
    expect(res.error?.code).toBe(404);
  });

  it('delete-entity cascades links', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1'));
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e2'));
    await callMethod(server, 'atomos-structura/create-link', makeLink('l1', 'e1', 'e2'));
    await callMethod(server, 'atomos-structura/delete-entity', { entityId: 'e1' });
    const schema = await callMethod(server, 'atomos-structura/get-schema', {});
    expect((schema.result?.['schema'] as { links: LinkProps[] })?.links).toHaveLength(0);
  });

  it('delete-entity returns 404 for missing id', async () => {
    const res = await callMethod(server, 'atomos-structura/delete-entity', { entityId: 'ghost' });
    expect(res.error?.code).toBe(404);
  });

  it('create-link stores link', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1'));
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e2'));
    await callMethod(server, 'atomos-structura/create-link', makeLink('l1', 'e1', 'e2'));
    const schema = await callMethod(server, 'atomos-structura/get-schema', {});
    expect((schema.result?.['schema'] as { links: LinkProps[] })?.links).toHaveLength(1);
  });

  // ── Sync state ──
  it('sync-state replaces entity/link cache silently', async () => {
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('old'));
    await callMethod(server, 'atomos-structura/sync-state', {
      entities: [makeEntity('new1'), makeEntity('new2')],
      links: [],
    });
    const schema = await callMethod(server, 'atomos-structura/get-schema', {});
    const entities = (schema.result?.['schema'] as { entities: Entity[] })?.entities ?? [];
    expect(entities.map(e => e.id).sort()).toEqual(['new1', 'new2']);
  });

  it('sync-state accepts settings', async () => {
    await callMethod(server, 'atomos-structura/sync-state', {
      entities: [],
      links: [],
      settings: { theme: 'dark' },
    });
    const res = await callMethod(server, 'atomos-structura/get-settings', {});
    expect((res.result?.['settings'] as Record<string, unknown>)?.['theme']).toBe('dark');
  });

  // ── Settings ──
  it('get-settings returns empty object initially', async () => {
    const res = await callMethod(server, 'atomos-structura/get-settings', {});
    expect(res.result?.['settings']).toEqual({});
  });

  it('update-settings merges settings', async () => {
    await callMethod(server, 'atomos-structura/update-settings', { settings: { a: 1 } });
    await callMethod(server, 'atomos-structura/update-settings', { settings: { b: 2 } });
    const res = await callMethod(server, 'atomos-structura/get-settings', {});
    const s = res.result?.['settings'] as Record<string, unknown>;
    expect(s?.['a']).toBe(1);
    expect(s?.['b']).toBe(2);
  });

  // ── Multi-schema ──
  it('list-schemas initially empty (no createSchemaTab called)', async () => {
    const res = await callMethod(server, 'atomos-structura/list-schemas', {});
    const schemas = (res.result?.['schemas'] as unknown[]) ?? [];
    expect(schemas).toHaveLength(0);
  });

  it('create-schema adds a schema', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 'schema-1', name: 'Orders' });
    const res = await callMethod(server, 'atomos-structura/list-schemas', {});
    expect((res.result?.['schemas'] as unknown[])?.length).toBe(1);
  });

  it('create-schema rejects duplicate id', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 's1', name: 'A' });
    const res = await callMethod(server, 'atomos-structura/create-schema', { id: 's1', name: 'B' });
    expect(res.error?.code).toBe(409);
  });

  it('rename-schema updates name', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 's1', name: 'Old' });
    await callMethod(server, 'atomos-structura/rename-schema', { id: 's1', name: 'New' });
    const res = await callMethod(server, 'atomos-structura/list-schemas', {});
    const schema = (res.result?.['schemas'] as Array<{ id: string; name: string }>)[0];
    expect(schema?.name).toBe('New');
  });

  it('rename-schema returns 404 for missing id', async () => {
    const res = await callMethod(server, 'atomos-structura/rename-schema', { id: 'nope', name: 'X' });
    expect(res.error?.code).toBe(404);
  });

  it('delete-schema removes schema', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 's1', name: 'Temp' });
    await callMethod(server, 'atomos-structura/delete-schema', { id: 's1' });
    const res = await callMethod(server, 'atomos-structura/list-schemas', {});
    expect((res.result?.['schemas'] as unknown[])?.length).toBe(0);
  });

  it('delete-schema returns 400 for active schema', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 's1', name: 'A' });
    await callMethod(server, 'atomos-structura/activate-schema', { id: 's1' });
    const res = await callMethod(server, 'atomos-structura/delete-schema', { id: 's1' });
    expect(res.error?.code).toBe(400);
  });

  it('activate-schema switches active and loads its entity cache', async () => {
    // schema A: entity e1
    await callMethod(server, 'atomos-structura/create-schema', { id: 'sa', name: 'A' });
    await callMethod(server, 'atomos-structura/activate-schema', { id: 'sa' });
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e1'));
    // schema B: entity e2
    await callMethod(server, 'atomos-structura/create-schema', { id: 'sb', name: 'B' });
    await callMethod(server, 'atomos-structura/activate-schema', { id: 'sb' });
    await callMethod(server, 'atomos-structura/create-entity', makeEntity('e2'));
    // Switch back to A — e1 should be visible, e2 should not
    await callMethod(server, 'atomos-structura/activate-schema', { id: 'sa' });
    const schema = await callMethod(server, 'atomos-structura/get-schema', {});
    const ids = (schema.result?.['schema'] as { entities: Entity[] })?.entities.map(e => e.id) ?? [];
    expect(ids).toContain('e1');
    expect(ids).not.toContain('e2');
  });

  it('activate-schema returns 404 for missing id', async () => {
    const res = await callMethod(server, 'atomos-structura/activate-schema', { id: 'nope' });
    expect(res.error?.code).toBe(404);
  });

  // ── Workspace persistence ──
  it('get-workspace returns all schemas and settings', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 's1', name: 'A' });
    await callMethod(server, 'atomos-structura/update-settings', { settings: { x: 42 } });
    const res = await callMethod(server, 'atomos-structura/get-workspace', {});
    const ws = res.result?.['workspace'] as { schemas: Array<{ id: string }>; settings: Record<string, unknown> };
    // s1 must be present; auto-created default schema may also appear
    expect(ws.schemas.some(s => s.id === 's1')).toBe(true);
    expect(ws.settings['x']).toBe(42);
  });

  it('load-workspace replaces full state', async () => {
    await callMethod(server, 'atomos-structura/create-schema', { id: 's-old', name: 'OldSchema' });
    await callMethod(server, 'atomos-structura/load-workspace', {
      workspace: {
        active_schema_id: 's-new',
        schemas: [{ id: 's-new', name: 'NewSchema', entities: [makeEntity('eX')], links: [] }],
        settings: { loaded: true },
      },
    });
    const schema = await callMethod(server, 'atomos-structura/get-schema', {});
    const entities = (schema.result?.['schema'] as { entities: Entity[] })?.entities ?? [];
    expect(entities[0]?.id).toBe('eX');
    const settled = await callMethod(server, 'atomos-structura/get-settings', {});
    expect((settled.result?.['settings'] as Record<string, unknown>)?.['loaded']).toBe(true);
    // old schema gone
    const list = await callMethod(server, 'atomos-structura/list-schemas', {});
    const ids = (list.result?.['schemas'] as Array<{ id: string }>).map(s => s.id);
    expect(ids).not.toContain('s-old');
  });
});
