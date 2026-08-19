import type { Entity, LinkProps } from '@atomos-web/structura-core';
import { emit_sse, find_canvas_for_schema, get_active_schema, update_schema_by_id } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export interface ProposedDiff {
  readonly diffId: string;
  readonly schemaId: string;
  readonly rationale?: string;
  readonly addedEntities?: Entity[];
  readonly modifiedEntities?: Entity[];
  readonly deletedEntityIds?: string[];
  readonly addedLinks?: LinkProps[];
  readonly deletedLinkIds?: string[];
  readonly createdAt: number;
}

const activeDiffs = new Map<string, ProposedDiff>();

export function registerDiffTools(): void {
  // 1. structura_propose_diff
  toolRegistry.registerTool(
    {
      name: 'structura_propose_diff',
      description: 'Propose an AI agent architecture change with added/modified/deleted entities and links for user review.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string', description: 'Target schema ID (defaults to active schema)' },
          rationale: { type: 'string', description: 'Explanation of why this change is proposed' },
          addedEntities: { type: 'array', description: 'New entities proposed to be added' },
          modifiedEntities: { type: 'array', description: 'Existing entities with proposed modifications' },
          deletedEntityIds: { type: 'array', items: { type: 'string' }, description: 'IDs of entities proposed to be deleted' },
          addedLinks: { type: 'array', description: 'New links proposed to be added' },
          deletedLinkIds: { type: 'array', items: { type: 'string' }, description: 'IDs of links proposed to be deleted' },
        },
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const active_schema = get_active_schema(srv._state);
      const schema_id = (args.schema_id as string) || active_schema?.id;
      if (!schema_id) return { error: { code: 400, message: 'No active schema found' }, id: reqId };

      const diffId = `diff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const diff: ProposedDiff = {
        diffId,
        schemaId: schema_id,
        ...(args.rationale !== undefined ? { rationale: args.rationale as string } : {}),
        ...(args.addedEntities !== undefined ? { addedEntities: args.addedEntities as Entity[] } : {}),
        ...(args.modifiedEntities !== undefined ? { modifiedEntities: args.modifiedEntities as Entity[] } : {}),
        ...(args.deletedEntityIds !== undefined ? { deletedEntityIds: args.deletedEntityIds as string[] } : {}),
        ...(args.addedLinks !== undefined ? { addedLinks: args.addedLinks as LinkProps[] } : {}),
        ...(args.deletedLinkIds !== undefined ? { deletedLinkIds: args.deletedLinkIds as string[] } : {}),
        createdAt: Date.now(),
      };

      activeDiffs.set(diffId, diff);

      // Broadcast proposal via SSE to visual canvas
      emit_sse(srv._clients, 'agent_diff_proposed', diff);

      return {
        result: {
          success: true,
          diffId,
          message: 'Architecture diff proposed successfully and broadcasted to canvas for review.',
        },
        id: reqId,
      };
    }
  );

  // 2. structura_apply_diff
  toolRegistry.registerTool(
    {
      name: 'structura_apply_diff',
      description: 'Apply and materialize a proposed AI agent diff into the schema graph.',
      inputSchema: {
        type: 'object',
        properties: {
          diffId: { type: 'string', description: 'ID of the proposed diff to apply' },
        },
        required: ['diffId'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const diffId = args.diffId as string;
      const diff = activeDiffs.get(diffId);
      if (!diff) return { error: { code: 404, message: `Diff '${diffId}' not found` }, id: reqId };

      const schema_id = diff.schemaId;
      if (!find_canvas_for_schema(srv._state, schema_id)) {
        return { error: { code: 404, message: 'Schema not found' }, id: reqId };
      }

      // Apply modifications to state
      srv._state = update_schema_by_id(srv._state, schema_id, s => {
        let entities = [...s.entities];
        let links = [...s.links];

        // 1. Remove deleted entities
        if (diff.deletedEntityIds && diff.deletedEntityIds.length > 0) {
          const toDelete = new Set(diff.deletedEntityIds);
          entities = entities.filter(e => !toDelete.has(e.id));
          links = links.filter(l => !toDelete.has(l.leftEntityId) && !toDelete.has(l.rightEntityId));
        }

        // 2. Remove deleted links
        if (diff.deletedLinkIds && diff.deletedLinkIds.length > 0) {
          const toDeleteLinks = new Set(diff.deletedLinkIds);
          links = links.filter(l => !toDeleteLinks.has(l.id));
        }

        // 3. Update modified entities
        if (diff.modifiedEntities && diff.modifiedEntities.length > 0) {
          const modMap = new Map(diff.modifiedEntities.map(e => [e.id, e]));
          entities = entities.map(e => modMap.get(e.id) ?? e);
        }

        // 4. Add new entities
        if (diff.addedEntities && diff.addedEntities.length > 0) {
          const existingIds = new Set(entities.map(e => e.id));
          const toAdd = diff.addedEntities.filter(e => !existingIds.has(e.id));
          entities = [...entities, ...toAdd];
        }

        // 5. Add new links
        if (diff.addedLinks && diff.addedLinks.length > 0) {
          const existingLinkIds = new Set(links.map(l => l.id));
          const toAddLinks = diff.addedLinks.filter(l => !existingLinkIds.has(l.id));
          links = [...links, ...toAddLinks];
        }

        return { ...s, entities, links };
      });

      activeDiffs.delete(diffId);

      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });
      emit_sse(srv._clients, 'agent_diff_applied', { diffId, schemaId: schema_id });

      return {
        result: {
          success: true,
          diffId,
          message: 'Proposed diff successfully materialized and applied to canvas.',
        },
        id: reqId,
      };
    }
  );

  // 3. structura_reject_diff
  toolRegistry.registerTool(
    {
      name: 'structura_reject_diff',
      description: 'Reject and dismiss a proposed AI agent architecture diff.',
      inputSchema: {
        type: 'object',
        properties: {
          diffId: { type: 'string', description: 'ID of the proposed diff to dismiss' },
          reason: { type: 'string', description: 'Optional feedback on why diff was rejected' },
        },
        required: ['diffId'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const diffId = args.diffId as string;
      if (!activeDiffs.has(diffId)) {
        return { error: { code: 404, message: `Diff '${diffId}' not found` }, id: reqId };
      }

      const diff = activeDiffs.get(diffId)!;
      activeDiffs.delete(diffId);
      emit_sse(srv._clients, 'agent_diff_rejected', { diffId, schemaId: diff.schemaId, reason: args.reason });

      return {
        result: {
          success: true,
          diffId,
          message: 'Proposed diff rejected and dismissed.',
        },
        id: reqId,
      };
    }
  );
}
