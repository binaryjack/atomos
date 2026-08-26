export interface NeuraPhysicsConfig {
  attractionForce: number;
  appartenanceGravity: number;
  repulsionForce: number;
  restingDistance: number;
  idealRadius: number;
  zSpread: number;
  globalGravity: number;
  alphaDecay: number;
  friction: number;
  maxSpeed: number;
}

export interface NeuraCameraConfig {
  minZoom: number;
  maxZoom: number;
  panSpeedMultiplier: number;
  orbitSpeedMultiplier: number;
  raycastHitTolerance: number;
}

export interface NeuraTelemetryConfig {
  defaultBeamColor: string;
  defaultBeamDurationMs: number;
  defaultPulseColor: string;
  defaultPulseDurationMs: number;
}

export interface NeuraConfig {
  physics: NeuraPhysicsConfig;
  camera: NeuraCameraConfig;
  telemetry: NeuraTelemetryConfig;
  cullingDistance: number;
}

export const DEFAULT_NEURA_CONFIG: NeuraConfig = {
  physics: {
    attractionForce: 0.05,
    appartenanceGravity: 0.08,
    repulsionForce: 0.02,
    restingDistance: 45,
    idealRadius: 180,
    zSpread: 1.0,
    globalGravity: 0.0005,
    alphaDecay: 0.97,
    friction: 0.82,
    maxSpeed: 12.0,
  },
  camera: {
    minZoom: 0.01,
    maxZoom: 8.0,
    panSpeedMultiplier: 1.0,
    orbitSpeedMultiplier: 0.007,
    raycastHitTolerance: 22,
  },
  telemetry: {
    defaultBeamColor: '#38bdf8',
    defaultBeamDurationMs: 800,
    defaultPulseColor: '#38bdf8',
    defaultPulseDurationMs: 400,
  },
  cullingDistance: 600,
};

export function createNeuraConfig(overrides?: Partial<NeuraConfig>): NeuraConfig {
  if (!overrides) return { ...DEFAULT_NEURA_CONFIG };
  return {
    physics: { ...DEFAULT_NEURA_CONFIG.physics, ...overrides.physics },
    camera: { ...DEFAULT_NEURA_CONFIG.camera, ...overrides.camera },
    telemetry: { ...DEFAULT_NEURA_CONFIG.telemetry, ...overrides.telemetry },
    cullingDistance: overrides.cullingDistance ?? DEFAULT_NEURA_CONFIG.cullingDistance,
  };
}
