import type { Signal } from './signal.types.js';
import type { LinkResult } from './link-result.types.js';
import type { LinkProps } from './link-props.types.js';
import type { EdgePosition } from '../../features/edge/types/edge-position.types.js';

export interface LinkManager {
  readonly links: Signal<Map<string, LinkResult>>;
  readonly createLink: (props: LinkProps) => LinkResult;
  readonly updateLinkPath: (
    linkId: string,
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    srcEdge?: EdgePosition,
    dstEdge?: EdgePosition
  ) => void;
  readonly removeLink: (linkId: string) => void;
  readonly getLink: (linkId: string) => LinkResult | undefined;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
