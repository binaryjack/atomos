export type DataType =
  | 'string'
  | 'number'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'uuid'
  | 'json'
  | 'array'
  | 'object';

export const DATA_TYPES: readonly DataType[] = [
  'string', 'number', 'integer', 'float',
  'boolean', 'date', 'uuid', 'json', 'array', 'object',
] as const;
