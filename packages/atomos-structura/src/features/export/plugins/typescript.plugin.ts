import { createSchemaGraphKernel } from '../../../core/create-schema-graph-kernel.js';
import { createTypescriptAdapter } from '../../../adapters/create-typescript-adapter.js';
import type { ExportPlugin } from '../export-plugin.types.js';

export const typescriptPlugin: ExportPlugin = {
  id: 'typescript',
  label: 'TypeScript Interfaces',
  description: 'TypeScript interface definitions with optional field types and outgoing relations.',
  fileExtension: 'ts',
  mimeType: 'text/plain',
  generate: snapshot => createTypescriptAdapter(createSchemaGraphKernel(snapshot)).generateInterfaces(),
};
