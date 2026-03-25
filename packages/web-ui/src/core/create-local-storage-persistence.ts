import type { Signal } from './types/signal.types.js';

const DEBOUNCE_MS = 400;

/**
 * Subscribes to a signal and persists its value to localStorage on change.
 * Writes are debounced to avoid thrashing on rapid updates.
 */
export const createLocalStoragePersistence = function<T>(
  key: string,
  signal: Signal<T>
): { destroy: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const write = (value: T): void => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // storage full or unavailable — silent
      }
    }, DEBOUNCE_MS);
  };

  const unsub = signal.subscribe(write);

  return {
    destroy: () => {
      unsub();
      clearTimeout(timer);
    }
  };
};

export const readLocalStorage = <T>(key: string): T | undefined => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
};
