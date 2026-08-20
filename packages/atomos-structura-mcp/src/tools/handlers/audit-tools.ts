import { auditArchitecture, computeGraphMetrics } from '@atomos-web/structura-core';
import { emit_sse, find_canvas_for_schema, get_active_schema, update_schema_by_id } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export function registerAuditTools(): void {
  // 1. structura_audit_architecture
  toolRegistry.registerTool(
    {
      name: 'structura_audit_architecture',
      description: 'Audit the active schema architecture for security violations, SPOFs, circular dependencies, and anti-patterns.',
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

      const auditResult = auditArchitecture(schema.entities, schema.links);

      // Broadcast audit events via SSE for live visual badges in canvas
      emit_sse(srv._clients, 'architecture_audited', { schemaId: schema_id, ...auditResult });

      return {
        result: {
          success: true,
          score: auditResult.score,
          passed: auditResult.passed,
          violationsCount: auditResult.violations.length,
          violations: auditResult.violations,
          metrics: auditResult.metrics,
        },
        id: reqId,
      };
    }
  );

  // 2. structura_get_graph_metrics
  toolRegistry.registerTool(
    {
      name: 'structura_get_graph_metrics',
      description: 'Get deep topological metrics: degree centrality, hubs, density, connected components, bottlenecks.',
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

      const metrics = computeGraphMetrics(schema.entities, schema.links);

      return {
        result: {
          success: true,
          metrics,
        },
        id: reqId,
      };
    }
  );

  // 3. structura_stream_operations
  toolRegistry.registerTool(
    {
      name: 'structura_stream_operations',
      description: 'Stream atomic graph operations (add nodes, connect links, move, resize) sequentially with live visual SSE updates.',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string', description: 'Target schema ID (defaults to active schema)' },
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['add_entity', 'update_entity', 'delete_entity', 'add_link', 'delete_link'] },
                payload: { type: 'object' },
              },
              required: ['action', 'payload'],
            },
            description: 'Ordered sequence of atomic operations',
          },
        },
        required: ['operations'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const active_schema = get_active_schema(srv._state);
      const schema_id = (args.schema_id as string) || active_schema?.id;
      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };

      const operations = args.operations as Array<{ action: string; payload: Record<string, unknown> }>;
      let executedCount = 0;

      srv._state = update_schema_by_id(srv._state, schema_id, s => {
        let entities = [...s.entities];
        let links = [...s.links];

        operations.forEach(op => {
          if (op.action === 'add_entity') {
            entities.push(op.payload as any);
            executedCount++;
          } else if (op.action === 'update_entity') {
            const entId = op.payload.id as string;
            entities = entities.map(e => e.id === entId ? { ...e, ...op.payload } as any : e);
            executedCount++;
          } else if (op.action === 'delete_entity') {
            const entId = op.payload.id as string;
            entities = entities.filter(e => e.id !== entId);
            links = links.filter(l => l.leftEntityId !== entId && l.rightEntityId !== entId);
            executedCount++;
          } else if (op.action === 'add_link') {
            links.push(op.payload as any);
            executedCount++;
          } else if (op.action === 'delete_link') {
            const linkId = op.payload.id as string;
            links = links.filter(l => l.id !== linkId);
            executedCount++;
          }
        });

        return { ...s, entities, links };
      });

      const canvas = find_canvas_for_schema(srv._state, schema_id);
      const schema = canvas?.schemas[schema_id];
      emit_sse(srv._clients, 'change', { schema_id, entities: schema?.entities ?? [], links: schema?.links ?? [] });

      return {
        result: {
          success: true,
          executedOperationsCount: executedCount,
        },
        id: reqId,
      };
    }
  );

  // 4. structura_step_execution
  toolRegistry.registerTool(
    {
      name: 'structura_step_execution',
      description: 'Control state machine execution visualization on the canvas (patch entity status, link flow, active step).',
      inputSchema: {
        type: 'object',
        properties: {
          schema_id: { type: 'string', description: 'Target schema ID (defaults to active schema)' },
          activeEntityIds: { type: 'array', items: { type: 'string' }, description: 'Entities currently in active/running state' },
          completedEntityIds: { type: 'array', items: { type: 'string' }, description: 'Entities in completed/success state' },
          errorEntityIds: { type: 'array', items: { type: 'string' }, description: 'Entities in error state' },
          activeLinkIds: { type: 'array', items: { type: 'string' }, description: 'Links currently transporting messages/data' },
          stepIndex: { type: 'number', description: 'Current step sequence number' },
        },
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      const active_schema = get_active_schema(srv._state);
      const schema_id = (args.schema_id as string) || active_schema?.id;
      if (!schema_id) return { error: { code: 400, message: 'No active schema' }, id: reqId };

      emit_sse(srv._clients, 'execution_telemetry_step', {
        schemaId: schema_id,
        activeEntityIds: args.activeEntityIds || [],
        completedEntityIds: args.completedEntityIds || [],
        errorEntityIds: args.errorEntityIds || [],
        activeLinkIds: args.activeLinkIds || [],
        stepIndex: args.stepIndex ?? 0,
      });

      return {
        result: {
          success: true,
          message: 'Execution telemetry step emitted to canvas.',
        },
        id: reqId,
      };
    }
  );
}
