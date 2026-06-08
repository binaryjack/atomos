import { f } from '@binaryjack/formular.dev';

export const menuItemConfigSchema = f.object({
  available: f.boolean(),
  value: f.union(f.number(), f.string(), f.boolean()).optional()
});

export const workspaceMenuConfigSchema = f.object({
  zoom: menuItemConfigSchema.optional(),
  zoom_in: menuItemConfigSchema.optional(),
  zoom_out: menuItemConfigSchema.optional(),
  center_on_screen: menuItemConfigSchema.optional(),
  fit_to_screen: menuItemConfigSchema.optional(),
  auto_layout: menuItemConfigSchema.optional(),
  optimize_connections: menuItemConfigSchema.optional(),
  export: menuItemConfigSchema.optional(),
  import: menuItemConfigSchema.optional(),
  save_workspace: menuItemConfigSchema.optional(),
  load_workspace: menuItemConfigSchema.optional(),
  export_svg: menuItemConfigSchema.optional(),
  customActions: f.array(f.object({
    id: f.string().nonempty(),
    label: f.string().nonempty(),
    icon: f.string().optional()
  })).optional()
});

export const workspaceConfigSchema = f.object({
  readonly: f.boolean().optional(),
  headless: f.boolean().optional(),
  allow_multiple_schemas: f.boolean().optional(),
  menu: workspaceMenuConfigSchema.optional()
});

export const universalSchema = f.object({
  config: workspaceConfigSchema.optional()
});

export function validateErathosTemplate(data: unknown) {
  return universalSchema.parse(data as any);
}
