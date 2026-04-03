import type { Signal } from './signal.types.js';

export interface EntityInstance {
  readonly id: string;
  readonly element: SVGGElement;
  readonly position: Signal<{ x: number; y: number }>;
  readonly dimensions: Signal<{ width: number; height: number }>;
  readonly cleanup: () => void;
  readonly notifyAnchorConnected?: (anchorId: string, linkId: string) => void;
  readonly updateMetadata?: (metadata: { shape?: string, color?: string, description?: string }) => void;
}
