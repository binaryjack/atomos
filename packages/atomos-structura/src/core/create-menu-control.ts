import type { MenuItemConfig, WorkspaceMenuConfig } from '@atomos-web/structura-core';
import type { MenuControl } from '../types/menu-control.types.js';

export const createMenuControl = function(initial?: WorkspaceMenuConfig): MenuControl {
  // Mutable internal config — spread so callers cannot mutate the original object
  let config: WorkspaceMenuConfig = { ...(initial ?? {}) };

  const listeners: Array<(cfg: WorkspaceMenuConfig) => void> = [];

  const notify = (): void => {
    const snapshot = config;
    listeners.forEach(fn => { try { fn(snapshot); } catch { /* ignore */ } });
  };

  const setAvailable = (item: keyof WorkspaceMenuConfig, available: boolean): void => {
    const existing = config[item] as MenuItemConfig<number> | undefined;
    config = {
      ...config,
      [item]: { ...(existing ?? {}), available },
    };
    notify();
  };

  const setValue = (_item: 'zoom', value: number): void => {
    const existing = config.zoom as MenuItemConfig<number> | undefined;
    config = {
      ...config,
      zoom: { available: existing?.available ?? true, value },
    };
    notify();
  };

  const getConfig = (): WorkspaceMenuConfig => config;

  const subscribe = (listener: (cfg: WorkspaceMenuConfig) => void): () => void => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  };

  return { setAvailable, setValue, getConfig, subscribe };
};
