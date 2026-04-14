import type { ToolboxConfiguration } from '@atomos-web/prime'
import type { SchemaGraphKernel } from '../../../core/create-schema-graph-kernel.js'

export interface CustomShape {
  id: string;
  name: string;
  svg: string;
}

export type FontFamily = 'sans-serif' | 'serif' | 'monospace' | 'system-ui' | 'Inter, sans-serif' | 'Georgia, serif' | 'Courier New, monospace';
export type FontWeight = 'normal' | '600' | 'bold';

export interface EntityStyleSettings {
  nameFontFamily: FontFamily;
  nameFontSize: number;
  nameFontWeight: FontWeight;
  nameColor: string;
  propsFontFamily: FontFamily;
  propsFontSize: number;
  propsFontWeight: FontWeight;
  propsColor: string;
  borderRadius: number;
  borderWidth: number;
  namePaddingY: number;
  propsPaddingY: number;
}

export interface LinkStyleSettings {
  color: string;
  selectedColor: string;
  thickness: number;
  selectedThickness: number;
}

export interface AppSettings {
  toolbox: ToolboxConfiguration;
  general?: {
    gridSize?: number;
    enableSnapping?: boolean;
    defaultLinkStyle?: string;
    gridPrimaryColor?: string;
    gridSecondaryColor?: string;
    canvasBackgroundColor?: string;
  };
  appearance?: {
    entity?: Partial<EntityStyleSettings>;
    link?: Partial<LinkStyleSettings>;
  };
  shapes: CustomShape[];
}

export interface SettingsPageProps {
  readonly initialSettings?: AppSettings;
  readonly onClose: (hasUnsavedChanges: boolean) => void;
  readonly onSave: (settings: AppSettings) => void;
  /** If provided, the Exports tab can test-export the live schema. */
  readonly getKernel?: () => SchemaGraphKernel;
}

export interface SettingsPageResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}
