import { f } from '@binaryjack/formular.dev';
import type { AppSettings, EntityStyleSettings, LinkStyleSettings } from '../types/app-settings.types.js';

export const customShapeSchema = f.object({
  id: f.string().nonempty(),
  name: f.string().nonempty(),
  svg: f.string().nonempty()
});

export const entityStyleSettingsSchema = f.object({
  nameFontFamily: f.enum(['sans-serif', 'serif', 'monospace', 'system-ui', 'Inter, sans-serif', 'Georgia, serif', 'Courier New, monospace'] as const),
  nameFontSize: f.number().int().positive(),
  nameFontWeight: f.enum(['normal', '600', 'bold'] as const),
  nameColor: f.string().nonempty(),
  propsFontFamily: f.enum(['sans-serif', 'serif', 'monospace', 'system-ui', 'Inter, sans-serif', 'Georgia, serif', 'Courier New, monospace'] as const),
  propsFontSize: f.number().int().positive(),
  propsFontWeight: f.enum(['normal', '600', 'bold'] as const),
  propsColor: f.string().nonempty(),
  borderRadius: f.number().int().min(0),
  borderWidth: f.number().int().min(0),
  namePaddingY: f.number().int(),
  propsPaddingY: f.number().int()
}) satisfies { readonly _output: EntityStyleSettings };

export const linkStyleSettingsSchema = f.object({
  color: f.string().nonempty(),
  selectedColor: f.string().nonempty(),
  thickness: f.number().int().positive(),
  selectedThickness: f.number().int().positive()
}) satisfies { readonly _output: LinkStyleSettings };

export const appSettingsSchema = f.object({
  general: f.object({
    gridSize: f.number().int().positive().optional(),
    enableSnapping: f.boolean().optional(),
    defaultLinkStyle: f.string().optional(),
    gridPrimaryColor: f.string().optional(),
    gridSecondaryColor: f.string().optional(),
    canvasBackgroundColor: f.string().optional()
  }).optional(),
  appearance: f.object({
    entity: entityStyleSettingsSchema.partial().optional(),
    link: linkStyleSettingsSchema.partial().optional()
  }).optional(),
  shapes: f.array(customShapeSchema).optional()
});
