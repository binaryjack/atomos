import { createSchemaGraphKernel } from '../../../core/create-schema-graph-kernel.js';
import { createSqlAdapter } from '../../../adapters/create-sql-adapter.js';
import type { ExportPlugin } from '../export-plugin.types.js';

export const sqlDdlPlugin: ExportPlugin = {
  id: 'sql-ddl',
  label: 'SQL DDL',
  description: 'MS SQL Server / PostgreSQL CREATE TABLE statements with FK constraints. Identifiers are quoted with [square brackets].',
  fileExtension: 'sql',
  mimeType: 'text/plain',
  generate: snapshot => createSqlAdapter(createSchemaGraphKernel(snapshot)).generateDDL(),
};
