import type { IncomingMessage, ServerResponse } from 'http';
import type { Entity, LinkProps } from '@atomos/structura-core';

export interface McpRequest {
  readonly method: string;
  readonly params: unknown;
  readonly id: string;
}

export interface McpResponse {
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
  readonly id: string;
}

export class VbsMcpServer {
  private entities: Map<string, Entity> = new Map();
  private links: Map<string, LinkProps> = new Map();
  
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method !== 'POST') {
        this.sendError(res, 405, 'Method not allowed', '');
        return;
      }
      
      const body = await this.readBody(req);
      const mcpRequest: McpRequest = JSON.parse(body);
      
      const response = await this.processRequest(mcpRequest);
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(response));
      
    } catch (error) {
      this.sendError(res, 500, error instanceof Error ? error.message : 'Internal error', '');
    }
  }
  
  private async processRequest(request: McpRequest): Promise<McpResponse> {
    switch (request.method) {
      case 'atomos-structura/create-entity':
        return this.createEntity(request);
      case 'atomos-structura/get-entity':
        return this.getEntity(request);
      case 'atomos-structura/update-entity':
        return this.updateEntity(request);
      case 'atomos-structura/delete-entity':
        return this.deleteEntity(request);
      case 'atomos-structura/create-link':
        return this.createLink(request);
      case 'atomos-structura/get-schema':
        return this.getSchema(request);
      default:
        return {
          error: { code: -32601, message: 'Method not found' },
          id: request.id
        };
    }
  }
  
  private createEntity(request: McpRequest): McpResponse {
    const entity = request.params as Entity;
    this.entities.set(entity.id, entity);
    
    return {
      result: { success: true, entity },
      id: request.id
    };
  }
  
  private getEntity(request: McpRequest): McpResponse {
    const { entityId } = request.params as { entityId: string };
    const entity = this.entities.get(entityId);
    
    if (!entity) {
      return {
        error: { code: 404, message: 'Entity not found' },
        id: request.id
      };
    }
    
    return {
      result: { entity },
      id: request.id
    };
  }
  
  private updateEntity(request: McpRequest): McpResponse {
    const entity = request.params as Entity;
    
    if (!this.entities.has(entity.id)) {
      return {
        error: { code: 404, message: 'Entity not found' },
        id: request.id
      };
    }
    
    this.entities.set(entity.id, entity);
    
    return {
      result: { success: true, entity },
      id: request.id
    };
  }
  
  private deleteEntity(request: McpRequest): McpResponse {
    const { entityId } = request.params as { entityId: string };
    
    if (!this.entities.has(entityId)) {
      return {
        error: { code: 404, message: 'Entity not found' },
        id: request.id
      };
    }
    
    this.entities.delete(entityId);
    
    return {
      result: { success: true },
      id: request.id
    };
  }
  
  private createLink(request: McpRequest): McpResponse {
    const link = request.params as LinkProps;
    this.links.set(link.id, link);
    
    return {
      result: { success: true, link },
      id: request.id
    };
  }
  
  private getSchema(request: McpRequest): McpResponse {
    const entities = Array.from(this.entities.values());
    const links = Array.from(this.links.values());
    
    return {
      result: { 
        schema: {
          entities,
          links,
          metadata: {
            createdAt: Date.now(),
            version: '1.0.0'
          }
        }
      },
      id: request.id
    };
  }
  
  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
  
  private sendError(res: ServerResponse, code: number, message: string, id: string): void {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(code);
    res.end(JSON.stringify({
      error: { code, message },
      id
    }));
  }
}
