import type { WorkspaceMenuConfig } from '@atomos-web/structura-core';

export interface MenuControl {
  /**
   * Toggle the `available` flag of a toolbar item at runtime.
   * Changes are broadcast immediately to all subscribers.
   */
  setAvailable(item: keyof WorkspaceMenuConfig, available: boolean): void;
  /**
   * Override the `value` of the zoom item (initial zoom level).
   * Only `'zoom'` supports a value; calling with any other key is a no-op.
   */
  setValue(item: 'zoom', value: number): void;
  /** Read the current resolved config snapshot. */
  getConfig(): WorkspaceMenuConfig;
  /** Subscribe to config changes. Returns an unsubscribe function. */
  subscribe(listener: (config: WorkspaceMenuConfig) => void): () => void;
}
