import type { SchemaGraphState } from '../../core/create-schema-graph-kernel.js';

export interface ExportPlugin {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly fileExtension: string;
  readonly mimeType: string;
  readonly generate: (snapshot: SchemaGraphState) => string;
}

export interface CustomExportPlugin {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly fileExtension: string;
  /** Raw JS function body: receives `snapshot` as argument, must return a string. */
  readonly fnBody: string;
}
