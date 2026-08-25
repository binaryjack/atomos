/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { createNeuraStore } from '../src/neura/core/neura-store.js';

describe('Neura Store Cognitive Glow & Thinking Pulse State', () => {
  it('initializes with zero cognitiveCharge and null thinkingPulse', () => {
    const { store } = createNeuraStore();
    expect(store.value.cognitiveCharge).toBe(0.0);
    expect(store.value.thinkingPulse).toBeNull();
  });

  it('updates cognitive charge level within [0.0, 1.0] bounds', () => {
    const { store, setCognitiveChargeStore } = createNeuraStore();

    setCognitiveChargeStore(0.65);
    expect(store.value.cognitiveCharge).toBe(0.65);

    setCognitiveChargeStore(1.5);
    expect(store.value.cognitiveCharge).toBe(1.0);

    setCognitiveChargeStore(-0.8);
    expect(store.value.cognitiveCharge).toBe(0.0);
  });

  it('sets and clears thinking pulse state', () => {
    const { store, setThinkingPulseStore } = createNeuraStore();

    const pulse = {
      active: true,
      startTime: 1000,
      durationMs: 1200,
      color: '#f59e0b',
      origin: [0, 0, 0] as [number, number, number],
      maxRadius: 1500,
    };

    setThinkingPulseStore(pulse);
    expect(store.value.thinkingPulse).toEqual(pulse);

    setThinkingPulseStore(null);
    expect(store.value.thinkingPulse).toBeNull();
  });

  it('resets cognitive charge and thinking pulse on resetAllActivities', () => {
    const { store, setCognitiveChargeStore, setThinkingPulseStore, resetAllActivities } = createNeuraStore();

    setCognitiveChargeStore(0.9);
    setThinkingPulseStore({
      active: true,
      startTime: 500,
      durationMs: 1000,
      color: '#38bdf8',
      origin: [0, 0, 0],
      maxRadius: 1000,
    });

    expect(store.value.cognitiveCharge).toBe(0.9);
    expect(store.value.thinkingPulse).not.toBeNull();

    resetAllActivities();

    expect(store.value.cognitiveCharge).toBe(0.0);
    expect(store.value.thinkingPulse).toBeNull();
  });
});
