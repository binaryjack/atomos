import { f } from '@binaryjack/formular.dev';
import type { BaseEntityProps } from '../types/base-entity.types';

export const baseEntitySchema = f.object({
  id:        f.string().nonempty(),
  code:      f.string().nonempty(),
  createdAt: f.number(),
  updatedAt: f.number()
}) satisfies { readonly _output: BaseEntityProps };
