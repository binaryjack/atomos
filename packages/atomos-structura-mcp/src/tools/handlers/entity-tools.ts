import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { emit_sse, find_canvas_for_schema, get_active_schema, update_schema_by_id } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export function registerEntityTools(): void {
  // 1. structura_create_entity
  toolRegistry.registerTool(
    {
      name: 'structura_create_entity',
      description: 'Add a new node/entity to the Erathos canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string' },
          id: { type: 'string' },
          type: { type: 'string' },
          position: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y']
          },
          props: { type: 'object' }
        },
        required: ['schema_id', 'id', 'type', 'position', 'props']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const params = (args as unknown) as { schema_id?: string } & Entity;
      const active_schema = get_active_schema(srv._state);
      const schema_id = params.schema_id || active_schema?.id;
      const { schema_id: _ignore, ...entity } = params;

      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };
      if (!find_canvas_for_schema(srv._state, schema_id)) return { error: { code: 404, message: 'Schema not found' }, id: reqId };

      srv._state = update_schema_by_id(srv._state, schema_id, s => ({
        ...s,
        entities: [...s.entities.filter(e => e.id !== entity.id), entity as Entity]
      }));

      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });

      return { result: { success: true, entity }, id: reqId };
    }
  );

  // 2. structura_get_entity
  toolRegistry.registerTool(
    {
      name: 'structura_get_entity',
      description: 'Get a node/entity by id from the active schema.',
      inputSchema: {
        type: 'object',
        properties: { entityId: { type: 'string' }, schema_id: { type: 'string' } },
        required: ['entityId']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const entityId = (args.entityId || args.id) as string;
      const schema_id = (args.schema_id as string) || get_active_schema(srv._state)?.id;
      if (!schema_id) return { error: { code: 404, message: 'Schema not found' }, id: reqId };
      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      const entity = schema?.entities.find(e => e.id === entityId);
      if (!entity) return { error: { code: 404, message: 'Entity not found' }, id: reqId };
      return { result: { entity }, id: reqId };
    }
  );

  // 3. structura_update_entity
  toolRegistry.registerTool(
    {
      name: 'structura_update_entity',
      description: 'Update an existing node/entity on the Erathos canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string' },
          id: { type: 'string' },
          props: { type: 'object' },
          position: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y']
          }
        },
        required: ['schema_id', 'id']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const params = (args as unknown) as { schema_id?: string } & Entity;
      const active_schema = get_active_schema(srv._state);
      const schema_id = params.schema_id || active_schema?.id;
      const { schema_id: _ignore, ...entity } = params;

      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };
      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      if (!schema?.entities.some(e => e.id === (entity as Entity).id)) {
        return { error: { code: 404, message: 'Entity not found' }, id: reqId };
      }

      srv._state = update_schema_by_id(srv._state, schema_id, s => ({
        ...s,
        entities: s.entities.map(e => (e.id === (entity as Entity).id ? (entity as Entity) : e))
      }));

      const updatedCanvas = find_canvas_for_schema(srv._state, schema_id);
      const updated = updatedCanvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: updated?.entities ?? [], links: updated?.links ?? [] });

      return { result: { success: true, entity }, id: reqId };
    }
  );

  // 4. structura_delete_entity
  toolRegistry.registerTool(
    {
      name: 'structura_delete_entity',
      description: 'Delete a node/entity and cascade associated links.',
      inputSchema: {
        type: 'object',
        properties: { entityId: { type: 'string' }, schema_id: { type: 'string' } },
        required: ['entityId']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const entityId = (args.entityId || args.id) as string;
      const schema_id = (args.schema_id as string) || get_active_schema(srv._state)?.id;
      if (!schema_id) return { error: { code: 404, message: 'Schema not found' }, id: reqId };
      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      if (!schema?.entities.some(e => e.id === entityId)) {
        return { error: { code: 404, message: 'Entity not found' }, id: reqId };
      }

      srv._state = update_schema_by_id(srv._state, schema_id, s => ({
        ...s,
        entities: s.entities.filter(e => e.id !== entityId),
        links: s.links.filter(l => l.leftEntityId !== entityId && l.rightEntityId !== entityId)
      }));

      const updatedCanvas = find_canvas_for_schema(srv._state, schema_id);
      const updated = updatedCanvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: updated?.entities ?? [], links: updated?.links ?? [] });

      return { result: { success: true }, id: reqId };
    }
  );

  // 5. structura_create_link
  toolRegistry.registerTool(
    {
      name: 'structura_create_link',
      description: 'Create a connection/link between two entities on the canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string' },
          id: { type: 'string' },
          leftEntityId: { type: 'string' },
          rightEntityId: { type: 'string' },
          leftAnchorId: { type: 'string' },
          rightAnchorId: { type: 'string' },
          direction: { type: 'string', enum: ['default', 'left', 'right'] },
          type: { type: 'string' },
          props: { type: 'object' }
        },
        required: ['schema_id', 'id', 'leftEntityId', 'rightEntityId', 'leftAnchorId', 'rightAnchorId']
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const params = (args as unknown) as { schema_id?: string } & LinkProps;
      const active_schema = get_active_schema(srv._state);
      const schema_id = params.schema_id || active_schema?.id;
      const { schema_id: _ignore, ...link } = params;

      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };
      if (!find_canvas_for_schema(srv._state, schema_id)) return { error: { code: 404, message: 'Schema not found' }, id: reqId };

      srv._state = update_schema_by_id(srv._state, schema_id, s => ({
        ...s,
        links: [...s.links.filter(l => l.id !== (link as LinkProps).id), link as LinkProps]
      }));

      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });

      return { result: { success: true, link }, id: reqId };
    }
  );

  // 6. structura_sync_state
  toolRegistry.registerTool(
    {
      name: 'structura_sync_state',
      description: 'Sync state from browser, updating entities, links, and settings.',
      inputSchema: {
        type: 'object',
        properties: {
          entities: { type: 'array' },
          links: { type: 'array' },
          settings: { type: 'object' }
        }
      }
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const schema = get_active_schema(srv._state);
      if (schema) {
        srv._state = update_schema_by_id(srv._state, schema.id, s => ({
          ...s,
          entities: (args.entities as Entity[]) ?? s.entities,
          links: (args.links as LinkProps[]) ?? s.links
        }));
      }
      if (args.settings) {
        const merged = { ...(srv._state.workspace.settings ?? {}), ...(args.settings as Record<string, unknown>) };
        srv._state = {
          ...srv._state,
          workspace: { ...srv._state.workspace, settings: merged }
        };
      }
      return { result: { success: true }, id: reqId };
    }
  );
}
