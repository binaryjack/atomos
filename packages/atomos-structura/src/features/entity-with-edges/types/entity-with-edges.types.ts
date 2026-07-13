import type { Signal } from '@atomos-web/prime';
import type { Property } from '@atomos-web/structura-core';
import type { EdgePosition } from '../../edge/types/edge.types.js';

export interface AnchorConfig {
  readonly id: string;
  readonly edgePosition: EdgePosition;
  readonly offset: number;
  readonly linkId?: string;
  readonly onConnect?: (linkId: string) => void;
  readonly onDisconnect?: () => void;
}

export interface EdgeConfig {
  readonly position: EdgePosition;
  readonly entityId: string;
  readonly thickness: 3 | 5;
  readonly anchor: AnchorConfig;
  readonly onHover?: (hovered: boolean) => void;
}

export interface EntityWithEdgesProps {
  readonly id: string;
  readonly title: Signal<string> | string;
  readonly properties: Signal<Property[]> | Property[];
  readonly position: Signal<{ x: number; y: number }> | { x: number; y: number };
  readonly dimensions: Signal<{ width: number; height: number }> | { width: number; height: number };
  readonly collapsed: Signal<boolean>;
  readonly selected: Signal<boolean>;
  readonly draggable: boolean;
  readonly resizable: boolean;
  readonly edges: {
    readonly top: EdgeConfig;
    readonly bottom: EdgeConfig;
    readonly left: EdgeConfig;
    readonly right: EdgeConfig;
  };
  readonly onDrag?: (delta: { x: number; y: number }) => void;
  readonly onResize?: (dimensions: { width: number; height: number }) => void;
  readonly onSelect?: () => void;
  readonly onPropertyChange?: (propertyId: string, value: unknown) => void;
}

export interface EntityWithEdgesResult {
  readonly element: SVGGElement;
  readonly cleanup: {
    readonly destroy: () => void;
  };
}
