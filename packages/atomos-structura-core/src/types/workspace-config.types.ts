import type { WorkspaceMenuConfig } from './menu-config.types.js';

export interface WorkspaceConfig {
  /** Freeze the graph. Short-circuits all drag, drop, and connection events. */
  readonly readonly?: boolean;
  /** Suppress all UI panels (settings page, schema panel, toolbar settings button). */
  readonly headless?: boolean;
  /**
   * When false a session is locked to a single schema.
   * createSchema / MCP create-schema are rejected once one schema exists.
   */
  readonly allow_multiple_schemas?: boolean;
  /** Disable local storage persistence for schemas, pushing responsibility to Redux/parent session. */
  readonly disableLocalStorage?: boolean;
  /** Schema injection validation mode: 'strict' (throw error) or 'passive' (store errors as warnings) */
  readonly validationMode?: 'strict' | 'passive';
  /** Allow zooming via the mouse wheel. Default is true. */
  readonly allowMouseZoom?: boolean;
  /** Allow panning via dragging the mouse. Default is true. */
  readonly allowPanDrag?: boolean;
  /** Fine-grained availability and value config for every canvas toolbar item. */
  readonly menu?: WorkspaceMenuConfig;
  /**
   * Hook for fetching options asynchronously for a property dropdown
   */
  readonly onLoadOptions?: (propertyKey: string, entityId: string) => Promise<{ label: string; value: unknown }[]>;
  /**
   * Inject an optional invisible edge zone that displays a message when hovered.
   * Particularly useful to guide users when the canvas automatically enters compact/read-only mode.
   */
  readonly hoverZoneMessage?: {
    zone: 'top' | 'bottom' | 'left' | 'right' | 'all';
    text: string;
  };
}
