import type { ToolboxConfiguration } from '../../../types/toolbox.types.js';
import type { DecisionMatrixCriterion, DecisionMatrixOption } from '../../decision-matrix/create-decision-matrix.js';

export interface AppSettings {
  toolbox: ToolboxConfiguration;
  matrices: {
    criteria: DecisionMatrixCriterion[];
    options: DecisionMatrixOption[];
  };
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
