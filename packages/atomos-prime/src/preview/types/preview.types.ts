import type { Signal } from '../../core/types/signal.types.js';

export interface ThemeContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface PreviewSectionProps {
  title: string;
  children: HTMLElement[];
  className?: string;
}

export interface PreviewSectionResult {
  element: HTMLElement;
  cleanup: {
    destroy: () => void;
  };
}

export interface ComponentPlaygroundProps {
  componentName: string;
  component: HTMLElement;
  props: Record<string, any>;
  onPropsChange?: (props: Record<string, any>) => void;
}

export interface ComponentPlaygroundResult {
  element: HTMLElement;
  updateComponent: (component: HTMLElement) => void;
  cleanup: {
    destroy: () => void;
  };
}