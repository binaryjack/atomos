import type { IStorageProvider } from './types/storage-provider.types.js';
import type { StorageConfig } from './types/storage-config.types.js';

export const createLocalStorageProvider = function<T = unknown>(
  config: StorageConfig = {}
): IStorageProvider<T> {
  const prefix = config.prefix ?? 'vbe2';
  const serialize = config.serializer?.serialize ?? JSON.stringify;
  const deserialize = config.serializer?.deserialize ?? JSON.parse;

  const key = (k: string): string => `${prefix}:${k}`;

  const get = async (k: string): Promise<T | null> => {
    const raw = localStorage.getItem(key(k));
    if (raw === null) return null;
    return deserialize(raw) as T;
  };

  const set = async (k: string, value: T): Promise<void> => {
    localStorage.setItem(key(k), serialize(value));
  };

  const deleteItem = async (k: string): Promise<void> => {
    localStorage.removeItem(key(k));
  };

  const list = async (): Promise<readonly string[]> => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${prefix}:`)) {
        keys.push(k.slice(prefix.length + 1));
      }
    }
    return keys;
  };

  const clear = async (): Promise<void> => {
    const keys = await list();
    keys.forEach(k => localStorage.removeItem(key(k)));
  };

  return { get, set, delete: deleteItem, list, clear };
};
