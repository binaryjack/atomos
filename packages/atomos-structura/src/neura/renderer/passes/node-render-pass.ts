// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type {
  NeuraNode,
  NodeActivityState,
  ThinkingPulseState,
  CognitiveEmotion,
  TurgorPulseState,
} from '../../core/neura-store.js';
import { STATE_HALO_COLORS, EMOTION_AURA_COLORS } from '../../core/neura-store.js';
import { parseHexColor, type Vec3 } from '../../math/math3d.js';
import type { NeuraBuffers } from '../neura-buffer-manager.js';
import type { ShaderTheme } from '../webgl-context.js';
import { EMOTION_MODE_ID, MORPHOLOGY_ID } from '../renderer-constants.js';

export interface NodeRenderPassParams {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffers: NeuraBuffers;
  nodes: NeuraNode[];
  mvp: Float32Array;
  viewportHeight: number;
  now: number;
  nowMs: number;
  modeId: number;
  theme: ShaderTheme;
  activeNodeIds: Set<string>;
  hasActiveFocus: boolean;
  cognitiveCharge: number;
  thinkingPulse: ThinkingPulseState | null;
  cognitiveEmotion: CognitiveEmotion;
  emotionIntensity: number;
  brainWaveFreq: number;
  brainWaveAmp: number;
  turgorPulses: Record<string, TurgorPulseState>;
}

export function getNodeColor(node: NeuraNode, theme: ShaderTheme): Vec3 {
  if (node.metadata?.color && typeof node.metadata.color === 'string') {
    return parseHexColor(node.metadata.color);
  }
  return getThemeColor(node.appartenanceId, theme);
}

export function getThemeColor(id: string, theme: ShaderTheme): Vec3 {
  const hash = id.split('').reduce((a, b) => {
    const acc = ((a << 5) - a) + b.charCodeAt(0);
    return acc & acc;
  }, 0);

  if (theme === 'cyber') {
    const palettes: Vec3[] = [
      [0.0, 0.94, 1.0],     // cyan
      [0.0, 0.47, 1.0],     // cobalt
      [0.55, 0.36, 0.96],   // indigo
      [0.06, 0.72, 0.51],   // emerald
    ];
    return palettes[Math.abs(hash) % palettes.length]!;
  }
  if (theme === 'neon') {
    const palettes: Vec3[] = [
      [0.22, 1.0, 0.08],    // neon green
      [1.0, 0.03, 0.23],    // neon pink
      [0.0, 0.9, 1.0],      // electric blue
      [0.74, 0.07, 1.0],    // neon purple
    ];
    return palettes[Math.abs(hash) % palettes.length]!;
  }
  const r = ((hash >> 16) & 0xFF) / 255;
  const g = ((hash >> 8) & 0xFF) / 255;
  const b = (hash & 0xFF) / 255;
  return [r, g, b];
}

export function renderNodePass(params: NodeRenderPassParams): void {
  const {
    gl,
    program,
    buffers,
    nodes,
    mvp,
    viewportHeight,
    now,
    nowMs,
    modeId,
    theme,
    activeNodeIds,
    hasActiveFocus,
    cognitiveCharge,
    thinkingPulse,
    cognitiveEmotion,
    emotionIntensity,
    brainWaveFreq,
    brainWaveAmp,
    turgorPulses,
  } = params;

  if (nodes.length === 0) return;

  gl.useProgram(program);

  const uMvp = gl.getUniformLocation(program, 'u_mvp_matrix');
  const uVh = gl.getUniformLocation(program, 'u_viewport_height');
  const uTheme = gl.getUniformLocation(program, 'u_theme_mode');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uCharge = gl.getUniformLocation(program, 'u_cognitive_charge');
  const uEmotionMode = gl.getUniformLocation(program, 'u_emotion_mode');
  const uEmotionColor = gl.getUniformLocation(program, 'u_emotion_color');
  const uEmotionIntensity = gl.getUniformLocation(program, 'u_emotion_intensity');
  const uBwFreq = gl.getUniformLocation(program, 'u_brain_wave_freq');
  const uBwAmp = gl.getUniformLocation(program, 'u_brain_wave_amp');

  const uRipActive = gl.getUniformLocation(program, 'u_ripple_active');
  const uRipTime = gl.getUniformLocation(program, 'u_ripple_time');
  const uRipDuration = gl.getUniformLocation(program, 'u_ripple_duration');
  const uRipMaxRadius = gl.getUniformLocation(program, 'u_ripple_max_radius');
  const uRipOrigin = gl.getUniformLocation(program, 'u_ripple_origin');
  const uRipColor = gl.getUniformLocation(program, 'u_ripple_color');

  gl.uniformMatrix4fv(uMvp, false, mvp);
  gl.uniform1f(uVh, viewportHeight || 600);
  gl.uniform1i(uTheme, modeId);
  gl.uniform1f(uTime, now);
  gl.uniform1f(uCharge, cognitiveCharge);
  gl.uniform1i(uEmotionMode, EMOTION_MODE_ID[cognitiveEmotion] ?? 0);
  const emotionRgb = EMOTION_AURA_COLORS[cognitiveEmotion] ?? [0.0, 0.94, 1.0];
  gl.uniform3f(uEmotionColor, emotionRgb[0], emotionRgb[1], emotionRgb[2]);
  gl.uniform1f(uEmotionIntensity, emotionIntensity);
  gl.uniform1f(uBwFreq, brainWaveFreq);
  gl.uniform1f(uBwAmp, brainWaveAmp);

  if (thinkingPulse && thinkingPulse.active) {
    const elapsed = performance.now() - thinkingPulse.startTime;
    const rgb = parseHexColor(thinkingPulse.color);
    gl.uniform1f(uRipActive, 1.0);
    gl.uniform1f(uRipTime, elapsed);
    gl.uniform1f(uRipDuration, thinkingPulse.durationMs);
    gl.uniform1f(uRipMaxRadius, thinkingPulse.maxRadius);
    gl.uniform3f(uRipOrigin, thinkingPulse.origin[0], thinkingPulse.origin[1], thinkingPulse.origin[2]);
    gl.uniform3f(uRipColor, rgb[0], rgb[1], rgb[2]);
  } else {
    gl.uniform1f(uRipActive, 0.0);
  }

  const positions = new Float32Array(nodes.length * 3);
  const colors = new Float32Array(nodes.length * 4);
  const sizes = new Float32Array(nodes.length);
  const activities = new Float32Array(nodes.length);
  const haloColors = new Float32Array(nodes.length * 3);
  const morphologies = new Float32Array(nodes.length);
  const turgorScales = new Float32Array(nodes.length);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    positions[i * 3] = node.x;
    positions[i * 3 + 1] = node.y;
    positions[i * 3 + 2] = node.z ?? 0;

    const [r, g, b] = getNodeColor(node, theme);

    let brightness = 0.75 + (Math.min(1.0, node.weight / 15.0) * 0.4);
    let opacity = 0.5 + (Math.min(1.0, node.weight / 15.0) * 0.5);

    if (hasActiveFocus) {
      if (activeNodeIds.has(node.id)) {
        brightness = 1.3;
        opacity = 1.0;
      } else {
        opacity = 0.04;
        brightness *= 0.25;
      }
    }

    const activity = node.activity ?? 0;
    if (activity > 0.1 && !hasActiveFocus) {
      brightness = Math.max(brightness, 0.9 + activity * 0.4);
      opacity = Math.max(opacity, 0.7 + activity * 0.3);
    }

    colors[i * 4] = Math.min(1.0, r * brightness);
    colors[i * 4 + 1] = Math.min(1.0, g * brightness);
    colors[i * 4 + 2] = Math.min(1.0, b * brightness);
    colors[i * 4 + 3] = opacity;

    sizes[i] = node.weight;
    activities[i] = activity;

    const state: NodeActivityState = node.state ?? 'idle';
    const halo = STATE_HALO_COLORS[state];
    haloColors[i * 3] = halo[0];
    haloColors[i * 3 + 1] = halo[1];
    haloColors[i * 3 + 2] = halo[2];

    morphologies[i] = MORPHOLOGY_ID[node.morphology ?? 'soma_spherical'] ?? 0.0;

    // Calculate dynamic turgor swelling pulse
    let turgor = 1.0;
    const pulse = turgorPulses[node.id];
    if (pulse) {
      const elapsed = nowMs - pulse.startedAt;
      if (elapsed >= 0 && elapsed <= pulse.durationMs) {
        if (elapsed < pulse.attackMs) {
          // Rapid swelling phase
          const t = elapsed / Math.max(1, pulse.attackMs);
          turgor = 1.0 + (pulse.peakDilation - 1.0) * t;
        } else {
          // Slow relaxation phase
          const t = (elapsed - pulse.attackMs) / Math.max(1, pulse.durationMs - pulse.attackMs);
          turgor = pulse.peakDilation - (pulse.peakDilation - 1.0) * t;
        }
      }
    }
    turgorScales[i] = Math.max(1.0, turgor);
  }

  const aPosition = gl.getAttribLocation(program, 'a_position');
  const aColor = gl.getAttribLocation(program, 'a_color');
  const aSizeAttr = gl.getAttribLocation(program, 'a_size_attr');
  const aActivity = gl.getAttribLocation(program, 'a_activity');
  const aHaloColor = gl.getAttribLocation(program, 'a_halo_color');
  const aMorphology = gl.getAttribLocation(program, 'a_morphology');
  const aTurgor = gl.getAttribLocation(program, 'a_turgor_scale');

  if (aPosition >= 0 && buffers.nodePositionBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  }

  if (aColor >= 0 && buffers.nodeColorBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodeColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
  }

  if (aSizeAttr >= 0 && buffers.nodeSizeBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodeSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aSizeAttr);
    gl.vertexAttribPointer(aSizeAttr, 1, gl.FLOAT, false, 0, 0);
  }

  if (aActivity >= 0 && buffers.nodeActivityBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodeActivityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, activities, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aActivity);
    gl.vertexAttribPointer(aActivity, 1, gl.FLOAT, false, 0, 0);
  }

  if (aHaloColor >= 0 && buffers.nodeHaloColorBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodeHaloColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, haloColors, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aHaloColor);
    gl.vertexAttribPointer(aHaloColor, 3, gl.FLOAT, false, 0, 0);
  }

  if (aMorphology >= 0 && buffers.nodeMorphologyBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodeMorphologyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, morphologies, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aMorphology);
    gl.vertexAttribPointer(aMorphology, 1, gl.FLOAT, false, 0, 0);
  }

  if (aTurgor >= 0 && buffers.nodeTurgorBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.nodeTurgorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, turgorScales, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aTurgor);
    gl.vertexAttribPointer(aTurgor, 1, gl.FLOAT, false, 0, 0);
  }

  gl.drawArrays(gl.POINTS, 0, nodes.length);

  if (aPosition >= 0) gl.disableVertexAttribArray(aPosition);
  if (aColor >= 0) gl.disableVertexAttribArray(aColor);
  if (aSizeAttr >= 0) gl.disableVertexAttribArray(aSizeAttr);
  if (aActivity >= 0) gl.disableVertexAttribArray(aActivity);
  if (aHaloColor >= 0) gl.disableVertexAttribArray(aHaloColor);
  if (aMorphology >= 0) gl.disableVertexAttribArray(aMorphology);
  if (aTurgor >= 0) gl.disableVertexAttribArray(aTurgor);
}
