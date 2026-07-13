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

export interface AppSettings<TToolbox = unknown> {
  /** Toolbox configuration. Uses generic to avoid coupling */
  toolbox: TToolbox;
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
