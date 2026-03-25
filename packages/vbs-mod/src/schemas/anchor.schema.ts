import { f } from '@binaryjack/formular.dev';
import type { AnchorProps } from '../types/anchor.types';

export const anchorSchema = f.object({
  id:           f.string().nonempty(),
  edgePosition: f.enum(['top', 'bottom', 'left', 'right'] as const),
  offset:       f.number(),
  linkId:       f.string().optional()
}) satisfies { readonly _output: AnchorProps };
