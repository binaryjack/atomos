import { describe, it, expect } from 'vitest';
import { createNeuraConfig, DEFAULT_NEURA_CONFIG } from '../src/neura/core/neura-config.js';

describe('NeuraConfig Configuration Manager', () => {
  it('returns default configuration when no overrides are provided', () => {
    const config = createNeuraConfig();
    expect(config.physics.attractionForce).toBe(DEFAULT_NEURA_CONFIG.physics.attractionForce);
    expect(config.camera.raycastHitTolerance).toBe(DEFAULT_NEURA_CONFIG.camera.raycastHitTolerance);
    expect(config.cullingDistance).toBe(600);
  });

  it('correctly merges partial physics and camera overrides', () => {
    const config = createNeuraConfig({
      physics: {
        attractionForce: 0.12,
        maxSpeed: 20.0,
      } as any,
      camera: {
        maxZoom: 12.0,
      } as any,
      cullingDistance: 1200,
    });

    expect(config.physics.attractionForce).toBe(0.12);
    expect(config.physics.maxSpeed).toBe(20.0);
    // Preserves non-overridden defaults
    expect(config.physics.friction).toBe(0.82);
    expect(config.camera.maxZoom).toBe(12.0);
    expect(config.camera.minZoom).toBe(0.01);
    expect(config.cullingDistance).toBe(1200);
  });
});
