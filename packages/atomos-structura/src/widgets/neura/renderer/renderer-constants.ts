// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { CognitiveEmotion } from '../core/neura-store.js';

export const EMOTION_MODE_ID: Record<CognitiveEmotion, number> = {
  harmonic_focus: 0,
  curiosity: 1,
  conflict: 2,
  insight: 3,
  high_load: 4,
  dreaming: 5,
};

export const MORPHOLOGY_ID: Record<string, number> = {
  soma_spherical: 0.0,
  soma_dendritic: 1.0,
  quantum_crystal: 2.0,
  vesicle_hologram: 3.0,
  ring_oracle: 4.0,
  wire: 0.0,
  myelinated_tube: 1.0,
  synaptic_lightning: 2.0,
  quantum_flow: 3.0,
  catenary_curve: 4.0,
};

export const BEAM_TRAIL_COUNT = 8;
