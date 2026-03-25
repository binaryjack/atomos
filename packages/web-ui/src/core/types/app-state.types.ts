import type { GlobalConfig } from './global-config.types.js';
import type { SchemaModel } from './schema-model.types.js';

export interface AppState {
  readonly activeSchemaId: string | undefined;
  readonly schemas: SchemaModel[];
  readonly global: GlobalConfig;
}
