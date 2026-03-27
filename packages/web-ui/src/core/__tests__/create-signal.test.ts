import { describe, it, expect, vi } from 'vitest';
import { createSignal } from '../create-signal.js';

describe('createSignal', () => {
  it('should create signal with initial value', () => {
    const signal = createSignal(42);
    expect(signal.value).toBe(42);
  });

  it('should update value and notify subscribers', () => {
    const signal = createSignal(10);
    const subscriber = vi.fn();
    
    signal.subscribe(subscriber);
    signal.set(20);
    
    expect(signal.value).toBe(20);
    expect(subscriber).toHaveBeenCalledWith(20);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should not notify if value is same reference', () => {
    const signal = createSignal({ x: 1 });
    const subscriber = vi.fn();
    
    signal.subscribe(subscriber);
    signal.set(signal.value); // Same reference
    
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should notify on new object even if deep equal', () => {
    const signal = createSignal({ x: 1 });
    const subscriber = vi.fn();
    
    signal.subscribe(subscriber);
    signal.set({ x: 1 }); // New reference
    
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should allow unsubscribe', () => {
    const signal = createSignal(0);
    const subscriber = vi.fn();
    
    const unsub = signal.subscribe(subscriber);
    signal.set(1);
    unsub();
    signal.set(2);
    
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(1);
  });

  it('should handle multiple subscribers', () => {
    const signal = createSignal(0);
    const sub1 = vi.fn();
    const sub2 = vi.fn();
    
    signal.subscribe(sub1);
    signal.subscribe(sub2);
    signal.set(100);
    
    expect(sub1).toHaveBeenCalledWith(100);
    expect(sub2).toHaveBeenCalledWith(100);
  });
});
