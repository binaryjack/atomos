import { f } from '@binaryjack/formular.dev';
import { entitySchema } from './entity.schema.js';
import { linkSchema } from './link.schema.js';

export const dagExchangeSchema = f.object({
  version: f.string().nonempty(),
  nodes: f.array(entitySchema),
  edges: f.array(linkSchema),
  applyAfterLoad: f.array(f.string()).optional()
});
