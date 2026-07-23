import type { McpRequest, McpResponse, McpToolDefinition, VbsMcpServerInstance } from '../mcp.types.js';

export type ToolCommandHandler = (
  srv: VbsMcpServerInstance,
  reqId: string,
  args: Record<string, unknown>
) => McpResponse | Promise<McpResponse>;

interface RegisteredTool {
  definition: McpToolDefinition;
  handler: ToolCommandHandler;
}

class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  public registerTool(definition: McpToolDefinition, handler: ToolCommandHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  public getToolsList(): McpToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  public async executeToolCall(srv: VbsMcpServerInstance, req: McpRequest): Promise<McpResponse> {
    const params = (req.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const name = params.name;
    const args = params.arguments ?? {};

    if (!name) {
      return { error: { code: 400, message: 'Missing tool name in params' }, id: req.id };
    }

    const tool = this.tools.get(name);
    if (!tool) {
      return { error: { code: -32601, message: `Tool '${name}' not found` }, id: req.id };
    }

    try {
      return await tool.handler(srv, req.id, args);
    } catch (error) {
      return {
        error: {
          code: 500,
          message: error instanceof Error ? error.message : 'Internal error during tool call'
        },
        id: req.id
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
