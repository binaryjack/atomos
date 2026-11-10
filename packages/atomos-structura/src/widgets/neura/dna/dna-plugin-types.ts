// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

export type SpatialDimensionType = '1D' | '2D' | '3D' | '4D';

export type StimulusControlType = 'button' | 'slider' | 'toggle';

export interface DnaStimulusControl {
  id: string;
  label: string;
  type: StimulusControlType;
  action: string;
  target_socket?: string;
  min?: number;
  max?: number;
  default?: number;
  args?: Record<string, unknown>;
  description?: string;
}

export interface DnaSocketPlugin {
  name: string;
  role: 'ingress' | 'egress';
  tensor_dim: number;
  x: number;
  y: number;
  z: number;
}

export interface DnaNodePlugin {
  id: string;
  x: number;
  y: number;
  z: number;
  weight: number;
  layer_index: number;
  neuron_index: number;
}

export interface DnaOrganVisualPlugin {
  plugin_version: string;
  organ_name: string;
  dimension: SpatialDimensionType;
  color_theme: string;
  theme_name: string;
  anchor_offset: {
    x: number;
    y: number;
    z: number;
  };
  nodes: DnaNodePlugin[];
  sockets: DnaSocketPlugin[];
  stimulus_controls: DnaStimulusControl[];
  telemetry_mapping: number[];
}

export interface DnaCableEdgePlugin {
  id: string;
  sourceId: string;
  targetId: string;
  source_coord: {
    x: number;
    y: number;
    z: number;
  };
  target_coord: {
    x: number;
    y: number;
    z: number;
  };
  weight: number;
}

export interface DnaCableVisualPlugin {
  plugin_version: string;
  cable_name: string;
  source_organ: string;
  source_socket: string;
  target_organ: string;
  target_socket: string;
  has_adaptation: boolean;
  beam_style: {
    color: string;
    durationMs: number;
    pulse_type: string;
  };
  edges: DnaCableEdgePlugin[];
}

export interface StimulusExecutionResult {
  controlId: string;
  action: string;
  success: boolean;
  timestamp: number;
  dispatchedEffects: string[];
  outputData?: unknown;
}
