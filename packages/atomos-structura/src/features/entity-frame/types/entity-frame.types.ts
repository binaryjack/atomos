import type { Signal } from '@atomos-web/prime';

export interface PropertyData {
  readonly key: string;
  readonly value: string;
  readonly type: 'string' | 'number' | 'boolean';
}

export interface EntityFrameProps {
  readonly title: string | Signal<string>;
  readonly properties?: PropertyData[] | Signal<PropertyData[]>;
  readonly subtitle?: string;
  readonly position?: { x: number; y: number } | Signal<{ x: number; y: number }>;
  readonly collapsed?: Signal<boolean>;
  readonly width?: number;
  readonly height?: number;
  readonly className?: string;
  readonly id?: string;
  readonly onDrag?: (delta: { x: number; y: number }) => void;
  readonly onResize?: (dimensions: { width: number; height: number }) => void;
  readonly onToggleCollapse?: (collapsed: boolean) => void;
  readonly onTitleClick?: () => void;
}

export interface EntityFrameResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}