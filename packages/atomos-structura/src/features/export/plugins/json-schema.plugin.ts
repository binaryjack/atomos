import { createSchemaGraphKernel } from '../../../core/create-schema-graph-kernel.js';
import type { ExportPlugin } from '../export-plugin.types.js';

export const jsonSchemaPlugin: ExportPlugin = {
  id: 'json-schema',
  label: 'JSON Schema',
  description: 'Draft-07 JSON Schema $definitions extracted from entity properties. Suitable for API request/response validation.',
  fileExtension: 'schema.json',
  mimeType: 'application/json',
  generate: snapshot => {
    const kernel = createSchemaGraphKernel(snapshot);
    const defs: Record<string, unknown> = {};
    Object.keys(snapshot.entities).forEach(id => {
      const ent = snapshot.entities[id];
      if (ent) defs[ent.name] = kernel.extractJsonSchema(id);
    });
    return JSON.stringify(
      { $schema: 'http://json-schema.org/draft-07/schema#', definitions: defs },
      null,
      2,
    );
  },
};
