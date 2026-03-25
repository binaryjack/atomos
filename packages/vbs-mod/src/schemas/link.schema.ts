import { f } from '@binaryjack/formular.dev';
import type { LinkProps } from '../types/link.types';

export const linkSchema = f.object({
  id:               f.string().nonempty(),
  leftEntityId:     f.string().nonempty(),
  rightEntityId:    f.string().nonempty(),
  leftCardinality:  f.enum(['1', '*', '0..1', '1..*'] as const),
  rightCardinality: f.enum(['1', '*', '0..1', '1..*'] as const),
  renderType:       f.enum(['linear', 'bezier', 'orthogonal'] as const),
  leftAnchorId:     f.string().nonempty(),
  rightAnchorId:    f.string().nonempty()
}) satisfies { readonly _output: LinkProps };
