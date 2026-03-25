import type { IObjectSchema, IObjectShape, ISchemaBase } from '@binaryjack/formular.dev';
import type { ComponentType, PropertyProps } from '../types/property.types';
import type { EntityProps, Position, Dimensions } from '../types/entity.types';
import type { EdgeProps } from '../types/edge.types';
import type { PropertiesRowProps } from '../types/properties-row.types';
import { entity } from '../entity';
import { propertiesRow } from '../properties-row';
import { createProperty } from './create-property';

const schemaToDefaultComponentType = (schema: ISchemaBase): ComponentType => {
  const name = Object.getPrototypeOf(schema).constructor.name as string;
  switch (name) {
    case 'BooleanSchema': return 'checkbox';
    case 'EnumSchema':    return 'select';
    default:              return 'input';
  }
};

export interface CreateEntityOptions<T extends IObjectShape> {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly schema: IObjectSchema<T>;
  readonly position: Position;
  readonly dimensions: Dimensions;
  readonly componentTypes?: Partial<Record<keyof T & string, ComponentType>>;
  readonly edges?: EdgeProps[];
}

export const createEntity = <T extends IObjectShape>(
  opts: CreateEntityOptions<T>
): EntityProps => {
  const properties: PropertyProps[] = Object.keys(opts.schema.shape).map((key) => {
    const fieldSchema = opts.schema.shape[key] as ISchemaBase;
    const componentType =
      (opts.componentTypes?.[key as keyof T & string]) ??
      schemaToDefaultComponentType(fieldSchema);

    return createProperty({ key, schema: fieldSchema, componentType });
  });

  const row: PropertiesRowProps = new (
    propertiesRow as unknown as new (p: PropertiesRowProps) => PropertiesRowProps
  )({ id: `${opts.id}-row-1`, properties, order: 1 });

  const props: EntityProps = {
    id: opts.id,
    code: opts.code,
    name: opts.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    position: opts.position,
    dimensions: opts.dimensions,
    propertiesRows: [row],
    edges: opts.edges ?? []
  };

  return new (entity as unknown as new (p: EntityProps) => EntityProps)(props);
};
