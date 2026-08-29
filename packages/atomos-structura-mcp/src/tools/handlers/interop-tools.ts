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

  // 3. structura_export_html
  toolRegistry.registerTool(
    {
      name: 'structura_export_html',
      description: 'Export active architecture schema into a self-contained, single-file HTML document for offline viewing and sharing.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the architecture diagram' },
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

      const title = (args.title as string) || 'Atomos Structura Architecture Diagram';
      const dagExchange = {
        type: 'DAGExchange',
        version: '1.0.0',
        nodes: schema.entities,
        edges: schema.links,
      };

      const htmlContent = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #020617; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    #header { height: 48px; background: #090d16; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; z-index: 50; }
    #header .title { font-size: 14px; font-weight: 600; color: #e2e8f0; }
    #header .badge { font-size: 10px; font-weight: 700; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 2px 8px; border-radius: 4px; }
    #viewer-container { width: 100%; height: calc(100% - 48px); position: relative; }
  </style>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@atomos-web/structura@5.0.0/dist/viewer/atomos-structura-viewer.js"></script>
</head>
<body>
  <div id="header">
    <div class="title">${title}</div>
    <div class="badge">STANDALONE VERIFIED DIAGRAM</div>
  </div>
  <div id="viewer-container">
    <atomos-structura-viewer id="viewer" enable-inspector-drawer="true" drawer-mode="push"></atomos-structura-viewer>
  </div>
  <script>
    const schemaData = ${JSON.stringify(dagExchange)};
    window.addEventListener('DOMContentLoaded', () => {
      const viewer = document.getElementById('viewer');
      if (viewer && typeof viewer.setSchema === 'function') {
        viewer.setSchema(schemaData);
      } else {
        customElements.whenDefined('atomos-structura-viewer').then(() => {
          document.getElementById('viewer').setSchema(schemaData);
        });
      }
    });
  </script>
</body>
</html>`;

      return {
        result: {
          success: true,
          title,
          entityCount: schema.entities.length,
          linkCount: schema.links.length,
          htmlContent,
        },
        id: reqId,
      };
    }
  );
}
