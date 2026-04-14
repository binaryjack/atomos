import type { EdgePosition } from '../../features/edge/types/edge-position.types.js'
import type { LinkProps } from './link-props.types.js'
import type { LinkResult } from './link-result.types.js'
import type { Signal } from './signal.types.js'

import type { RenderType } from '@atomos-web/structura-core'

export interface LinkManager {
  readonly links: Signal<Map<string, LinkResult>>;
  readonly createLink: (props: LinkProps) => LinkResult;
  readonly updateLinkPath: (
    linkId: string,
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    srcEdge?: EdgePosition,
    dstEdge?: EdgePosition,
    renderType?: RenderType,
    srcRect?: { x: number; y: number; width: number; height: number },
    dstRect?: { x: number; y: number; width: number; height: number }
  ) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getLink: (linkId: string) => LinkResult | undefined;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
