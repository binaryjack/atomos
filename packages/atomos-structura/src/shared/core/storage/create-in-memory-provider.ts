import type { IStorageProvider } from './types/storage-provider.types.js';

export const createInMemoryProvider = function<T = unknown>(): IStorageProvider<T> {
  const store = new Map<string, T>();

  const get = async (key: string): Promise<T | null> => {
    return store.get(key) ?? null;
  };

  const set = async (key: string, value: T): Promise<void> => {
    store.set(key, value);
  };

  const deleteItem = async (key: string): Promise<void> => {
    store.delete(key);
  };

  const list = async (): Promise<readonly string[]> => {
    return Array.from(store.keys());
  };

  const clear = async (): Promise<void> => {
    store.clear();
  };

  return { get, set, delete: deleteItem, list, clear };
};
