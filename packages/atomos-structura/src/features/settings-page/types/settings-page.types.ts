import type { ToolboxConfiguration } from '@atomos/prime'
import type { DecisionMatrixCriterion, DecisionMatrixOption } from '../../decision-matrix/index.js'

export interface CustomShape {
  id: string;
  name: string;
  svg: string;
}

export interface AppSettings {
  toolbox: ToolboxConfiguration;
  matrices: {
    criteria: DecisionMatrixCriterion[];
    options: DecisionMatrixOption[];
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
