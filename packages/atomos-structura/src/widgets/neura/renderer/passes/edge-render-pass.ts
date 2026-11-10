// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type {
  NeuraEdge,
  NeuraNode,
  ThinkingPulseState,
  CognitiveEmotion,
} from '../../core/neura-store.js';
import { EMOTION_AURA_COLORS } from '../../core/neura-store.js';
import { parseHexColor } from '../../math/math3d.js';
import type { NeuraBuffers } from '../neura-buffer-manager.js';
import type { ShaderTheme } from '../webgl-context.js';
import { EMOTION_MODE_ID, MORPHOLOGY_ID } from '../renderer-constants.js';

export interface EdgeRenderPassParams {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffers: NeuraBuffers;
  edges: NeuraEdge[];
  nodeLookup: Map<string, NeuraNode>;
  mvp: Float32Array;
  now: number;
  modeId: number;
  theme: ShaderTheme;
  activeEdgeIds: Set<string>;
  hasActiveFocus: boolean;
  cognitiveCharge: number;
  thinkingPulse: ThinkingPulseState | null;
  cognitiveEmotion: CognitiveEmotion;
  brainWaveFreq: number;
  brainWaveAmp: number;
}

export function renderEdgePass(params: EdgeRenderPassParams): void {
  const {
    gl,
    program,
    buffers,
    edges,
    nodeLookup,
    mvp,
    now,
    modeId,
    theme,
    activeEdgeIds,
    hasActiveFocus,
    cognitiveCharge,
    thinkingPulse,
    cognitiveEmotion,
    brainWaveFreq,
    brainWaveAmp,
  } = params;

  gl.useProgram(program);

  const eMvp = gl.getUniformLocation(program, 'u_mvp_matrix');
  const eTime = gl.getUniformLocation(program, 'u_time');
  const eTheme = gl.getUniformLocation(program, 'u_theme_mode');
  const eCharge = gl.getUniformLocation(program, 'u_cognitive_charge');
  const eEmotionMode = gl.getUniformLocation(program, 'u_emotion_mode');
  const eEmotionColor = gl.getUniformLocation(program, 'u_emotion_color');
  const eBwFreq = gl.getUniformLocation(program, 'u_brain_wave_freq');
  const eBwAmp = gl.getUniformLocation(program, 'u_brain_wave_amp');

  const uRipActive = gl.getUniformLocation(program, 'u_ripple_active');
  const uRipTime = gl.getUniformLocation(program, 'u_ripple_time');
  const uRipDuration = gl.getUniformLocation(program, 'u_ripple_duration');
  const uRipMaxRadius = gl.getUniformLocation(program, 'u_ripple_max_radius');
  const uRipOrigin = gl.getUniformLocation(program, 'u_ripple_origin');
  const uRipColor = gl.getUniformLocation(program, 'u_ripple_color');

  gl.uniformMatrix4fv(eMvp, false, mvp);
  gl.uniform1f(eTime, now);
  gl.uniform1i(eTheme, modeId);
  gl.uniform1f(eCharge, cognitiveCharge);
  gl.uniform1i(eEmotionMode, EMOTION_MODE_ID[cognitiveEmotion] ?? 0);
  const emotionRgb = EMOTION_AURA_COLORS[cognitiveEmotion] ?? [0.0, 0.94, 1.0];
  gl.uniform3f(eEmotionColor, emotionRgb[0], emotionRgb[1], emotionRgb[2]);
  gl.uniform1f(eBwFreq, brainWaveFreq);
  gl.uniform1f(eBwAmp, brainWaveAmp);

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

  const edgePositions = new Float32Array(edges.length * 6);
  const edgeColors = new Float32Array(edges.length * 8);
  const edgeMorphologies = new Float32Array(edges.length * 2);
  const edgeTs = new Float32Array(edges.length * 2);

  let edgeCount = 0;
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const source = nodeLookup.get(edge.sourceId);
    const target = nodeLookup.get(edge.targetId);
    if (source && target) {
      edgePositions[edgeCount * 6] = source.x;
      edgePositions[edgeCount * 6 + 1] = source.y;
      edgePositions[edgeCount * 6 + 2] = source.z ?? 0;
      edgePositions[edgeCount * 6 + 3] = target.x;
      edgePositions[edgeCount * 6 + 4] = target.y;
      edgePositions[edgeCount * 6 + 5] = target.z ?? 0;

      let r = 0.0, g = 0.75, b = 1.0, a = 0.25;
      if (theme === 'neon') {
        r = 0.2; g = 1.0; b = 0.4; a = 0.25;
      } else if (theme === 'pulse') {
        r = 0.8; g = 0.2; b = 0.9; a = 0.3;
      }

      if (hasActiveFocus) {
        if (activeEdgeIds.has(edge.id)) {
          r = 0.9; g = 0.95; b = 1.0; a = 0.95;
        } else {
          a = 0.02;
        }
      }

      // Vert 1 (Source)
      edgeColors[edgeCount * 8] = r;
      edgeColors[edgeCount * 8 + 1] = g;
      edgeColors[edgeCount * 8 + 2] = b;
      edgeColors[edgeCount * 8 + 3] = a;

      // Vert 2 (Target)
      edgeColors[edgeCount * 8 + 4] = r;
      edgeColors[edgeCount * 8 + 5] = g;
      edgeColors[edgeCount * 8 + 6] = b;
      edgeColors[edgeCount * 8 + 7] = a;

      const morphVal = MORPHOLOGY_ID[edge.morphology ?? 'wire'] ?? 0.0;
      edgeMorphologies[edgeCount * 2] = morphVal;
      edgeMorphologies[edgeCount * 2 + 1] = morphVal;

      edgeTs[edgeCount * 2] = 0.0;
      edgeTs[edgeCount * 2 + 1] = 1.0;

      edgeCount++;
    }
  }

  if (edgeCount === 0) return;

  const ePosAttr = gl.getAttribLocation(program, 'a_position');
  const eColorAttr = gl.getAttribLocation(program, 'a_color');
  const eMorphAttr = gl.getAttribLocation(program, 'a_morphology');
  const eTAttr = gl.getAttribLocation(program, 'a_t');

  if (ePosAttr >= 0 && buffers.edgePositionBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, edgePositions.subarray(0, edgeCount * 6), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(ePosAttr);
    gl.vertexAttribPointer(ePosAttr, 3, gl.FLOAT, false, 0, 0);
  }

  if (eColorAttr >= 0 && buffers.edgeColorBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgeColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, edgeColors.subarray(0, edgeCount * 8), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(eColorAttr);
    gl.vertexAttribPointer(eColorAttr, 4, gl.FLOAT, false, 0, 0);
  }

  if (eMorphAttr >= 0 && buffers.edgeMorphologyBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgeMorphologyBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, edgeMorphologies.subarray(0, edgeCount * 2), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(eMorphAttr);
    gl.vertexAttribPointer(eMorphAttr, 1, gl.FLOAT, false, 0, 0);
  }

  if (eTAttr >= 0 && buffers.edgeTBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgeTBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, edgeTs.subarray(0, edgeCount * 2), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(eTAttr);
    gl.vertexAttribPointer(eTAttr, 1, gl.FLOAT, false, 0, 0);
  }

  gl.drawArrays(gl.LINES, 0, edgeCount * 2);

  if (ePosAttr >= 0) gl.disableVertexAttribArray(ePosAttr);
  if (eColorAttr >= 0) gl.disableVertexAttribArray(eColorAttr);
  if (eMorphAttr >= 0) gl.disableVertexAttribArray(eMorphAttr);
  if (eTAttr >= 0) gl.disableVertexAttribArray(eTAttr);
}
