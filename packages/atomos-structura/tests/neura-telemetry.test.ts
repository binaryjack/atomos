/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { createNeuraStore, STATE_HALO_COLORS } from '../src/neura/core/neura-store.js';

describe('Neura Store Telemetry & Illumination Capabilities', () => {
  it('initializes with empty energyBeams array', () => {
    const { store } = createNeuraStore();
    expect(store.value.energyBeams).toEqual([]);
  });

  it('updates node activity and state via setNodeActivity', () => {
    const { store, addNodes, setNodeActivity } = createNeuraStore();

    addNodes([
      {
        id: 'node-1',
        x: 10,
        y: 20,
        weight: 5,
        appartenanceId: 'cluster-a',
        metadata: {},
        visible: true,
      },
    ]);

    expect(store.value.nodes['node-1']?.activity).toBeUndefined();

    setNodeActivity('node-1', 0.85, 'routing');

    expect(store.value.nodes['node-1']?.activity).toBe(0.85);
    expect(store.value.nodes['node-1']?.state).toBe('routing');
  });

  it('clamps activity values between 0.0 and 1.0', () => {
    const { store, addNodes, setNodeActivity } = createNeuraStore();

    addNodes([
      {
        id: 'node-1',
        x: 0,
        y: 0,
        weight: 1,
        appartenanceId: 'c1',
        metadata: {},
        visible: true,
      },
    ]);

    setNodeActivity('node-1', 2.5);
    expect(store.value.nodes['node-1']?.activity).toBe(1.0);

    setNodeActivity('node-1', -0.5);
    expect(store.value.nodes['node-1']?.activity).toBe(0.0);
  });

  it('manages energy beams via addEnergyBeam and removeBeam', () => {
    const { store, addEnergyBeam, removeBeam } = createNeuraStore();

    const beam1 = {
      id: 'beam-1',
      sourceId: 'node-1',
      targetId: 'node-2',
      progress: 0.2,
      color: '#00d4ff',
      durationMs: 800,
      startedAt: Date.now(),
    };

    addEnergyBeam(beam1);
    expect(store.value.energyBeams).toHaveLength(1);
    expect(store.value.energyBeams[0]?.id).toBe('beam-1');

    removeBeam('beam-1');
    expect(store.value.energyBeams).toHaveLength(0);
  });

  it('resets all node activities and clears beams on resetAllActivities', () => {
    const { store, addNodes, setNodeActivity, addEnergyBeam, resetAllActivities } = createNeuraStore();

    addNodes([
      { id: 'n1', x: 0, y: 0, weight: 1, appartenanceId: 'c', metadata: {}, visible: true },
      { id: 'n2', x: 1, y: 1, weight: 1, appartenanceId: 'c', metadata: {}, visible: true },
    ]);

    setNodeActivity('n1', 0.9, 'firing');
    setNodeActivity('n2', 0.7, 'active');
    addEnergyBeam({
      id: 'b1',
      sourceId: 'n1',
      targetId: 'n2',
      progress: 0.5,
      color: '#ff6b00',
      durationMs: 500,
      startedAt: Date.now(),
    });

    expect(store.value.energyBeams).toHaveLength(1);

    resetAllActivities();

    expect(store.value.nodes['n1']?.activity).toBe(0);
    expect(store.value.nodes['n1']?.state).toBe('idle');
    expect(store.value.nodes['n2']?.activity).toBe(0);
    expect(store.value.nodes['n2']?.state).toBe('idle');
    expect(store.value.energyBeams).toEqual([]);
  });

  it('defines valid RGB halo colors for all NodeActivityState values', () => {
    const states = ['idle', 'routing', 'active', 'firing', 'verifying', 'learning'] as const;
    for (const s of states) {
      const rgb = STATE_HALO_COLORS[s];
      expect(rgb).toBeDefined();
      expect(rgb.length).toBe(3);
      expect(rgb[0]).toBeGreaterThanOrEqual(0);
      expect(rgb[0]).toBeLessThanOrEqual(1);
    }
  });
});
