import { emit_sse } from '../../domain/workspace-helpers.js';
import type { McpResponse, VbsMcpServerInstance } from '../../mcp.types.js';
import { toolRegistry } from '../tool-registry.js';

export function registerNeuraTools(): void {
  // 1. neura_publish_topology
  toolRegistry.registerTool(
    {
      name: 'neura_publish_topology',
      description: 'Publish and inject a 3D graph topology (nodes and edges) into the Neura WebGL engine.',
      inputSchema: {
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            description: 'List of 3D Neura nodes.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                x: { type: 'number' },
                y: { type: 'number' },
                z: { type: 'number' },
                weight: { type: 'number' },
                appartenanceId: { type: 'string' },
                metadata: { type: 'object' },
              },
              required: ['id', 'x', 'y', 'weight', 'appartenanceId'],
            },
          },
          edges: {
            type: 'array',
            description: 'List of 3D Neura edges.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                sourceId: { type: 'string' },
                targetId: { type: 'string' },
                weight: { type: 'number' },
              },
              required: ['id', 'sourceId', 'targetId'],
            },
          },
        },
        required: ['nodes', 'edges'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): Promise<McpResponse> => {
      const actionReqId = `neura_publish_topology-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      emit_sse(srv._clients, 'frontend-action-request', {
        action: 'neura_publish_topology',
        reqId: actionReqId,
        args,
      });

      return new Promise<McpResponse>(resolve => {
        srv._pendingRequests.set(actionReqId, {
          resolve: result => resolve({ result: { success: true, ...(result as object) }, id: reqId }),
          reject: err => resolve({ error: { code: 500, message: err.message }, id: reqId }),
        });

        setTimeout(() => {
          if (srv._pendingRequests.has(actionReqId)) {
            srv._pendingRequests.delete(actionReqId);
            // Non-blocking fallback if no frontend client acknowledged
            resolve({ result: { success: true, buffered: true, note: 'Topology dispatched to active clients' }, id: reqId });
          }
        }, 5000);
      });
    }
  );

  // 2. neura_stream_activity
  toolRegistry.registerTool(
    {
      name: 'neura_stream_activity',
      description: 'Stream real-time node activity level (0.0 to 1.0) and semantic state to Neura 3D WebGL engine.',
      inputSchema: {
        type: 'object',
        properties: {
          nodeId: { type: 'string', description: 'Target node ID' },
          activity: { type: 'number', description: 'Activity level from 0.0 (idle) to 1.0 (maximum illumination)' },
          state: {
            type: 'string',
            enum: ['idle', 'routing', 'active', 'firing', 'verifying', 'learning'],
            description: 'Semantic state for coronal halo color coding',
          },
        },
        required: ['nodeId', 'activity'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      emit_sse(srv._clients, 'neura-telemetry', {
        type: 'set-node-activity',
        payload: {
          nodeId: args.nodeId,
          activity: args.activity,
          state: args.state ?? 'active',
        },
      });

      return { result: { success: true, nodeId: args.nodeId, activity: args.activity }, id: reqId };
    }
  );

  // 3. neura_trigger_beam
  toolRegistry.registerTool(
    {
      name: 'neura_trigger_beam',
      description: 'Fire a luminous energy beam pulse along a 3D edge between source and target nodes in Neura WebGL.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceId: { type: 'string', description: 'Source node ID' },
          targetId: { type: 'string', description: 'Target node ID' },
          color: { type: 'string', description: 'Hex color string (e.g. #00d4ff or #ff6b00)' },
          durationMs: { type: 'number', description: 'Travel duration in milliseconds (default 800ms)' },
        },
        required: ['sourceId', 'targetId'],
      },
    },
    (srv: VbsMcpServerInstance, reqId: string, args: Record<string, unknown>): McpResponse => {
      emit_sse(srv._clients, 'neura-telemetry', {
        type: 'trigger-energy-beam',
        payload: {
          sourceId: args.sourceId,
          targetId: args.targetId,
          color: args.color ?? '#00d4ff',
          durationMs: args.durationMs ?? 800,
        },
      });

      return {
        result: {
          success: true,
          sourceId: args.sourceId,
          targetId: args.targetId,
        },
        id: reqId,
      };
    }
  );

  // 4. neura_reset_activity
  toolRegistry.registerTool(
    {
      name: 'neura_reset_activity',
      description: 'Reset all node activities to idle (0.0) and clear all active energy beams in Neura WebGL.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    (srv: VbsMcpServerInstance, reqId: string): McpResponse => {
      emit_sse(srv._clients, 'neura-telemetry', {
        type: 'reset-all-activities',
        payload: {},
      });

      return { result: { success: true }, id: reqId };
    }
  );
}
