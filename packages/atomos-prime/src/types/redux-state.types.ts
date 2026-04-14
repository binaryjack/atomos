import type { Entity, LinkProps } from '@atomos-web/structura-core';

export interface SchemaModel {
  readonly id: string;
  readonly name: string;
  readonly entities: readonly Entity[];
  readonly links: readonly LinkProps[];
}

export interface LinkModel {
  readonly id: string;
  readonly from_entity_id: string;
  readonly to_entity_id: string;
  readonly from_anchor?: string | undefined;
  readonly to_anchor?: string | undefined;
}

export interface ViewportState {
  readonly pan: { x: number; y: number };
  readonly zoom: number;
}

export interface ReduxState {
  readonly schemas: Record<string, SchemaModel>;
  readonly active_schema_id: string;
  readonly canvas_viewport: ViewportState;
}

export type ReduxAction = 
  | { type: 'entity-moved'; schema_id: string; entity_id: string; x: number; y: number }
  | { type: 'entity-resized'; schema_id: string; entity_id: string; width: number; height: number }
  | { type: 'entity-updated'; schema_id: string; entity: Entity }
  | { type: 'entity-added'; schema_id: string; entity: Entity }
  | { type: 'entity-removed'; schema_id: string; entity_id: string }
  | { type: 'link-created'; schema_id: string; link_id?: string; from_id: string; to_id: string; from_anchor?: string; to_anchor?: string; leftCardinality?: string; rightCardinality?: string; leftProperty?: string; rightProperty?: string }
  | { type: 'link-updated'; schema_id: string; link: LinkProps }
  | { type: 'link-removed'; schema_id: string; link_id: string }
  | { type: 'viewport-updated'; viewport: ViewportState }
  | { type: 'state-loaded'; state: ReduxState };

export interface ReduxStore {
  readonly get_state: () => ReduxState;
  readonly dispatch: (action: ReduxAction) => void;
  readonly subscribe: (listener: (state: ReduxState) => void) => () => void;
}
