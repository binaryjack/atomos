import type { IValidationOptions } from '@binaryjack/formular.dev';
import type { ComponentType } from '../shared/component-type';
import type { DataType } from '../shared/data-type';

export type { ComponentType, DataType };

export interface Property {
  readonly key: string;
  readonly label: string;
  readonly value: unknown;
  readonly dataType: DataType;
  readonly componentType: ComponentType;
  readonly validation?: IValidationOptions;
}