import type { ISchemaBase } from '@binaryjack/formular.dev';
import type { ComponentType } from '../shared/component-type';
import type { DataType } from '../shared/data-type';
import type { PropertyProps } from '../types/property.types';
import { property } from '../property';

export interface CreatePropertyOptions {
  readonly key: string;
  readonly label?: string;
  readonly schema: ISchemaBase;
  readonly componentType: ComponentType;
  readonly dataType?: DataType;
  readonly value?: unknown;
}

export const createProperty = (opts: CreatePropertyOptions): PropertyProps => {
  const props: PropertyProps = {
    key: opts.key,
    label: opts.label ?? opts.key,
    value: opts.value ?? undefined,
    dataType: opts.dataType ?? 'string',
    componentType: opts.componentType,
    schema: opts.schema
  };
  return new (property as unknown as new (p: PropertyProps) => PropertyProps)(props);
};
