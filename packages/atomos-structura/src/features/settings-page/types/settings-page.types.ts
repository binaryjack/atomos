import type { ToolboxConfiguration } from '@atomos-web/prime'
import type { SchemaGraphKernel } from '../../../core/create-schema-graph-kernel.js'
import type { AppSettings as CoreAppSettings } from '@atomos-web/structura-core'

export type AppSettings = CoreAppSettings<ToolboxConfiguration>;
export type { CustomShape, FontFamily, FontWeight, EntityStyleSettings, LinkStyleSettings } from '@atomos-web/structura-core';

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
