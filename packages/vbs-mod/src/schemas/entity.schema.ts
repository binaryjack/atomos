import { f } from '@binaryjack/formular.dev';

// NOTE: no `satisfies EntityProps` here — PropertyProps.schema: ISchemaBase is
// a live schema object and cannot be expressed as an f.object() field value.
// Individual field schemas are validated by their own schema files.
export const entitySchema = f.object({
  id:             f.string().nonempty(),
  code:           f.string().nonempty(),
  createdAt:      f.number(),
  updatedAt:      f.number(),
  name:           f.string().nonempty(),
  propertiesRows: f.array(f.object({
    id:         f.string().nonempty(),
    order:      f.number().int(),
    properties: f.array(f.object({
      key:           f.string().nonempty(),
      label:         f.string(),
      value:         f.string().optional(),
      dataType:      f.enum(['string','number','integer','float','boolean','date','uuid','json','array','object'] as const),
      componentType: f.enum(['input', 'select', 'checkbox', 'textarea'] as const)
    }))
  })),
  position:   f.object({ x: f.number(), y: f.number() }),
  dimensions: f.object({ width: f.number(), height: f.number() }),
  edges:      f.array(f.object({
    position:      f.enum(['top', 'bottom', 'left', 'right'] as const),
    entityId:      f.string().nonempty(),
    thickness:     f.union(f.literal(3), f.literal(5)),
    anchors:       f.array(f.object({
      id:           f.string().nonempty(),
      edgePosition: f.enum(['top', 'bottom', 'left', 'right'] as const),
      offset:       f.number(),
      linkId:       f.string().optional()
    })),
    isHighlighted: f.boolean()
  }))
});
