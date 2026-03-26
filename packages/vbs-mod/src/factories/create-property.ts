import type { IValidationOptions } from '@binaryjack/formular.dev';
import type { ComponentType } from '../shared/component-type';
import type { DataType } from '../shared/data-type';
import type { Property } from '../types/property.types';

export interface CreatePropertyOptions {
  readonly key: string;
  readonly label?: string;
  readonly validation?: IValidationOptions;
  readonly componentType: ComponentType;
  readonly dataType?: DataType;
  readonly value?: unknown;
}

export const createProperty = (opts: CreatePropertyOptions): Property => {
  const prop: Property = {
    key: opts.key,
    label: opts.label ?? opts.key,
    value: opts.value ?? undefined,
    dataType: opts.dataType ?? 'string',
    componentType: opts.componentType
  };
  
  if (opts.validation !== undefined) {
    return { ...prop, validation: opts.validation };
  }
  
  return prop;
};
