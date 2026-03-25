import type { Theme } from '../shared/theme';
import type { RenderType } from '../shared/render-type';

export interface SettingsProps {
  readonly theme: Theme;
  readonly gridSize: number;
  readonly snapToGrid: boolean;
  readonly showGrid: boolean;
  readonly autoSave: boolean;
  readonly autoSaveInterval: number;
  readonly defaultEntityWidth: number;
  readonly defaultEntityHeight: number;
  readonly defaultLinkType: RenderType;
}