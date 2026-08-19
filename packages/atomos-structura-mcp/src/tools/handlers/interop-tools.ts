import {
  findCycles,
  parsePrismaSchema,
  parseSqlDDL,
  parseTypeScriptAST,
} from '@atomos-web/structura-core';
import { emit_sse, find_canvas_for_schema, get_active_schema, update_schema_by_id } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export function registerInteropTools(): void {
  // 1. structura_import_schema
  toolRegistry.registerTool(
    {
      name: 'structura_import_schema',
      description: 'Import an external schema (Prisma, SQL DDL, TypeScript, or Mermaid) and generate nodes on the canvas.',
      inputSchema: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['prisma', 'sql', 'typescript', 'mermaid'], description: 'Source format' },
          code: { type: 'string', description: 'Raw code content to parse' },
          schema_id: { type: 'string', description: 'Target schema ID (defaults to active schema)' },
        },
        required: ['format', 'code'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const format = args.format as 'prisma' | 'sql' | 'typescript' | 'mermaid';
      const code = args.code as string;
      const active_schema = get_active_schema(srv._state);
      const schema_id = (args.schema_id as string) || active_schema?.id;
      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };

      let parsed: { schema: { entities: any[]; links: any[] } };
      try {
        switch (format) {
          case 'prisma':
            parsed = parsePrismaSchema(code);
            break;
          case 'sql':
            parsed = parseSqlDDL(code);
            break;
          case 'typescript':
            parsed = parseTypeScriptAST(code);
            break;
          default:
            return { error: { code: 400, message: `Unsupported format '${format}'` }, id: reqId };
        }
      } catch (err) {
        return { error: { code: 500, message: `Parse error: ${err instanceof Error ? err.message : String(err)}` }, id: reqId };
      }

      srv._state = update_schema_by_id(srv._state, schema_id, s => ({
        ...s,
        entities: [...s.entities, ...parsed.schema.entities],
        links: [...s.links, ...parsed.schema.links],
      }));

      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });

      return {
        result: {
          success: true,
          importedEntitiesCount: parsed.schema.entities.length,
          importedLinksCount: parsed.schema.links.length,
        },
        id: reqId,
      };
    }
  );

  // 2. structura_detect_cycles
  toolRegistry.registerTool(
    {
      name: 'structura_detect_cycles',
      description: 'Analyze active schema graph for circular dependencies and return cycle paths.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string', description: 'Target schema ID (defaults to active schema)' },
        },
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const active_schema = get_active_schema(srv._state);
      const schema_id = (args.schema_id as string) || active_schema?.id;
      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };

      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      if (!schema) return { error: { code: 404, message: 'Schema not found' }, id: reqId };

      const cycleResult = findCycles(schema.entities, schema.links);

      return {
        result: {
          success: true,
          hasCycles: cycleResult.hasCycles,
          cycleCount: cycleResult.cycles.length,
          cycles: cycleResult.cycles,
        },
        id: reqId,
      };
    }
  );
}
