import type { ISchemaBase } from '@binaryjack/formular.dev';
import type { ComponentType } from '../shared/component-type';
import type { DataType } from '../shared/data-type';

export type { ComponentType, DataType };

export interface PropertyProps {
  readonly key: string;
  readonly label: string;
  readonly value: unknown;
  readonly dataType: DataType;
  readonly componentType: ComponentType;
  readonly schema: ISchemaBase;
}