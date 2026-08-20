import type { Entity } from '../../types/entity.types.js';
import type { LinkProps } from '../../types/link.types.js';

export const generateOpenApiSpec = (
  entities: readonly Entity[],
  _links: readonly LinkProps[]
): string => {
  const spec: Record<string, any> = {
    openapi: '3.1.0',
    info: {
      title: 'Auto-Generated Architecture API',
      version: '1.0.0',
      description: 'API Specification generated from Atomo Structura graph',
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  entities
    .filter(e => (e as any).nodeType !== 'zone' && !(e as any).metadata?.isZone && (e as any).nodeType !== 'sticky-note')
    .forEach(e => {
      const resourcePath = `/${e.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const schemaName = e.name.replace(/[^a-zA-Z0-9]/g, '');

      // Path definition
      spec.paths[resourcePath] = {
        get: {
          summary: `List all ${e.name} items`,
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: `#/components/schemas/${schemaName}`,
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: `Create a new ${e.name}`,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${schemaName}`,
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created',
            },
          },
        },
      };

      // Schema definition
      const properties: Record<string, any> = {
        id: { type: 'string', format: 'uuid' },
      };
      const required: string[] = ['id'];

      (e.properties || []).forEach(p => {
        const type = p.dataType === 'integer' || p.dataType === 'float' ? 'number' : p.dataType === 'boolean' ? 'boolean' : 'string';
        properties[p.key] = { type };
        if (p.validation?.required) {
          required.push(p.key);
        }
      });

      spec.components.schemas[schemaName] = {
        type: 'object',
        properties,
        required,
      };
    });

  return JSON.stringify(spec, null, 2);
};
