import { f } from '@binaryjack/formular.dev';
import type { EdgeProps } from '../types/edge.types';

export const edgeSchema = f.object({
  position:      f.enum(['top', 'bottom', 'left', 'right'] as const),
  entityId:      f.string().nonempty(),
  thickness:     f.union(f.literal(3), f.literal(5)),
  anchors:       f.array(f.object({ id: f.string(), edgePosition: f.enum(['top', 'bottom', 'left', 'right'] as const), offset: f.number(), linkId: f.string().optional() })),
  isHighlighted: f.boolean()
}) satisfies { readonly _output: EdgeProps };
