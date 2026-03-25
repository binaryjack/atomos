import type { DataType } from '@vbs/vbs-mod';

export interface GlobalConfig {
  readonly dataTypes: readonly DataType[];
  readonly defaultEntityWidth: number;
  readonly defaultEntityHeight: number;
  readonly theme: 'light' | 'dark';
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  dataTypes: [
    'string', 'number', 'integer', 'float',
    'boolean', 'date', 'uuid', 'json', 'array', 'object',
  ],
  defaultEntityWidth: 260,
  defaultEntityHeight: 160,
  theme: 'dark',
};
