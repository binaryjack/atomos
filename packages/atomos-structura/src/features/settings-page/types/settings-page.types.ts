import type { ToolboxConfiguration } from '@atomos/prime'

export interface CustomShape {
  id: string;
  name: string;
  svg: string;
}

export interface AppSettings {
  toolbox: ToolboxConfiguration;
  general?: {
    gridSize?: number;
    enableSnapping?: boolean;
    defaultLinkStyle?: string;
  };
  shapes: CustomShape[];
}

export interface SettingsPageProps {
  readonly initialSettings?: AppSettings;
  readonly onClose: (hasUnsavedChanges: boolean) => void;
  readonly onSave: (settings: AppSettings) => void;
}

export interface SettingsPageResult {
  readonly element: HTMLElement;
  readonly cleanup: { destroy: () => void };
}
