import type { IObjectSchema, IObjectShape, ISchemaBase, IValidationOptions } from '@binaryjack/formular.dev';
import type { ComponentType } from '../shared/component-type';
import type { EdgeProps } from '../types/edge.types';
import type { EntityShape } from '../types/entity-shape.types';
import type { Dimensions, Entity, Position } from '../types/entity.types';
import type { Property } from '../types/property.types';
import { createProperty } from './create-property.js';

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
  readonly shape?: EntityShape;
  readonly nodeType?: string;
  readonly schema: IObjectSchema<T>;
  readonly position: Position;
  readonly dimensions: Dimensions;
  readonly componentTypes?: Partial<Record<keyof T & string, ComponentType>>;
  readonly edges?: EdgeProps[];
}

export const createEntity = <T extends IObjectShape>(
  opts: CreateEntityOptions<T>
): Entity => {
  const properties: Property[] = Object.keys(opts.schema.shape).map((key) => {
    const fieldSchema = opts.schema.shape[key] as ISchemaBase;
    const componentType =
      (opts.componentTypes?.[key as keyof T & string]) ??
      schemaToDefaultComponentType(fieldSchema);

    // Extract validation from schema if available
    const validation = (fieldSchema as any).validation as IValidationOptions | undefined;
    
    return validation !== undefined
      ? createProperty({ key, validation, componentType })
      : createProperty({ key, componentType });
  });

  return {
    id: opts.id,
    code: opts.code,
    name: opts.name,
    ...(opts.shape !== undefined ? { shape: opts.shape } : {}),
    ...(opts.nodeType !== undefined ? { nodeType: opts.nodeType } : {}),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    position: opts.position,
    dimensions: opts.dimensions,
    properties,
    edges: opts.edges ?? [],
  };
};
