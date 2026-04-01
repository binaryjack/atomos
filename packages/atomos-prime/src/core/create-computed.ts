import type { Signal, ComputedSignal } from './types/signal.types.js';

export const createComputed = function<T>(
  computation: () => T, 
  dependencies: Signal<any>[]
): ComputedSignal<T> {
  let currentValue = computation();
  const subscribers = new Set<(value: T) => void>();
  const cleanupFunctions: Array<() => void> = [];
  
  const updateValue = () => {
    const newValue = computation();
    if (currentValue !== newValue) {
      currentValue = newValue;
      subscribers.forEach(callback => callback(newValue));
    }
  };
  
  dependencies.forEach(dep => {
    const unsubscribe = dep.subscribe(updateValue);
    cleanupFunctions.push(unsubscribe);
  });
  
  return {
    readonly: true,
    
    get value() {
      return currentValue;
    },
    
    subscribe: (callback: (value: T) => void) => {
      subscribers.add(callback);
      
      return () => {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          cleanupFunctions.forEach(cleanup => cleanup());
        }
      };
    }
  };
};