import { createSchemaGraphKernel } from '../../../core/create-schema-graph-kernel.js';
import { createPrismaAdapter } from '../../../adapters/create-prisma-adapter.js';
import type { ExportPlugin } from '../export-plugin.types.js';

export const prismaPlugin: ExportPlugin = {
  id: 'prisma',
  label: 'Prisma Schema',
  description: 'Prisma ORM schema with models, relations, and field types. Ready to use with prisma-client-js on PostgreSQL.',
  fileExtension: 'prisma',
  mimeType: 'text/plain',
  generate: snapshot => createPrismaAdapter(createSchemaGraphKernel(snapshot)).generatePrismaSchema(),
};
