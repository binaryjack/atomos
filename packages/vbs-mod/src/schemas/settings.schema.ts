import { f } from '@binaryjack/formular.dev';
import type { SettingsProps } from '../types/settings.types';

export const settingsSchema = f.object({
  theme:                f.enum(['light', 'dark'] as const),
  gridSize:             f.number().int().positive(),
  snapToGrid:           f.boolean(),
  showGrid:             f.boolean(),
  autoSave:             f.boolean(),
  autoSaveInterval:     f.number().int().positive(),
  defaultEntityWidth:   f.number().int().positive(),
  defaultEntityHeight:  f.number().int().positive(),
  defaultLinkType:      f.enum(['linear', 'bezier', 'orthogonal'] as const)
}) satisfies { readonly _output: SettingsProps };
