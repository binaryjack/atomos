import type { ISchemaBase } from '@binaryjack/formular.dev';
import type { ComponentType, PropertyProps, PropertyType } from '../types/property.types';
import { property } from '../property';

const schemaNameToPropertyType = (schema: ISchemaBase): PropertyType => {
  const name = Object.getPrototypeOf(schema).constructor.name as string;
  switch (name) {
    case 'StringSchema':  return 'string';
    case 'NumberSchema':  return 'number';
    case 'BooleanSchema': return 'boolean';
    case 'DateSchema':    return 'date';
    case 'EnumSchema':    return 'enum';
    case 'LiteralSchema': return 'literal';
    case 'ArraySchema':   return 'array';
    case 'ObjectSchema':  return 'object';
    case 'UnionSchema':   return 'union';
    case 'RecordSchema':  return 'record';
    default:              return 'string';
  }
};

export interface CreatePropertyOptions {
  readonly key: string;
  readonly schema: ISchemaBase;
  readonly componentType: ComponentType;
  readonly value?: unknown;
}

export const createProperty = (opts: CreatePropertyOptions): PropertyProps => {
  const props: PropertyProps = {
    key: opts.key,
    value: opts.value ?? undefined,
    type: schemaNameToPropertyType(opts.schema),
    componentType: opts.componentType,
    schema: opts.schema
  };
  return new (property as unknown as new (p: PropertyProps) => PropertyProps)(props);
};
