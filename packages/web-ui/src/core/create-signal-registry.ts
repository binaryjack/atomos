import { createSignal } from './create-signal.js';
import type { Signal } from './types/signal.types.js';

export interface SignalRegistry {
  readonly getOrCreate: <T>(key: object, init: T) => Signal<T>;
  readonly get: <T>(key: object) => Signal<T> | undefined;
  readonly delete: (key: object) => void;
}

export const createSignalRegistry = function(): SignalRegistry {
  const map = new WeakMap<object, Signal<unknown>>();

  const getOrCreate = <T>(key: object, init: T): Signal<T> => {
    if (!map.has(key)) map.set(key, createSignal(init) as Signal<unknown>);
    return map.get(key) as unknown as Signal<T>;
  };

  const get = <T>(key: object): Signal<T> | undefined =>
    map.has(key) ? (map.get(key) as unknown as Signal<T>) : undefined;

  const del = (key: object): void => { map.delete(key); };

  return { getOrCreate, get, delete: del };
};

/** Singleton registry shared across the entire app lifetime */
export const registry = createSignalRegistry();
