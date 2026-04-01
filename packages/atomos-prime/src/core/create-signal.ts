import type { Signal } from './types/signal.types.js';

export const createSignal = function<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  const subscribers = new Set<(value: T) => void>();
  
  return {
    get value() {
      return currentValue;
    },
    
    set: (newValue: T) => {
      if (currentValue !== newValue) {
        currentValue = newValue;
        subscribers.forEach(callback => callback(newValue));
      }
    },
    
    subscribe: (callback: (value: T) => void) => {
      subscribers.add(callback);
      
      return () => {
        subscribers.delete(callback);
      };
    }
  };
};