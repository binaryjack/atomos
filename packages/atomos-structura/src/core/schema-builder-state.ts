import type { Entity, LinkProps, SettingsProps } from '@atomos-web/structura-core';

export interface SchemaBuilderState {
  readonly entities: Map<string, Entity>;
  readonly links: Map<string, LinkProps>;
  readonly selectedEntityId: string | undefined;
  readonly settings: SettingsProps;
}

export const createSchemaBuilderState = function(): SchemaBuilderState {
  return {
    entities: new Map<string, Entity>(),
    links: new Map<string, LinkProps>(),
    selectedEntityId: undefined,
    settings: {
      theme: 'light',
      gridSize: 16,
      snapToGrid: true,
      showGrid: true,
      autoSave: true,
      autoSaveInterval: 30000,
      defaultEntityWidth: 200,
      defaultEntityHeight: 100,
      defaultLinkType: 'orthogonal'
    }
  };
};
