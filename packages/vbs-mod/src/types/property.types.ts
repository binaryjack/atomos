import type { ISchemaBase } from '@binaryjack/formular.dev';

export type PropertyType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'literal'
  | 'array'
  | 'object'
  | 'union'
  | 'record';

export type ComponentType = 'input' | 'select' | 'checkbox' | 'textarea';

export interface PropertyProps {
  readonly key: string;
  readonly value: unknown;
  readonly type: PropertyType;
  readonly componentType: ComponentType;
  readonly schema: ISchemaBase;
}