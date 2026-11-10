// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraNode, SynapticLightningState } from '../../core/neura-store.js';
import { parseHexColor } from '../../math/math3d.js';
import type { NeuraBuffers } from '../neura-buffer-manager.js';
import { restoreStandardBlending } from '../webgl-context.js';

export interface LightningRenderPassParams {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffers: NeuraBuffers;
  lightnings: SynapticLightningState[];
  nodeLookup: Map<string, NeuraNode>;
  now: number;
}

export function renderLightningPass(params: LightningRenderPassParams): void {
  const { gl, program, buffers, lightnings, nodeLookup, now } = params;

  if (lightnings.length === 0) return;

  const activeLightnings = lightnings.filter(l => (now * 1000 - l.startedAt) < l.durationMs);
  if (activeLightnings.length === 0) return;

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.depthMask(false);

  gl.useProgram(program);

  const segmentsPerArc = 16;
  const totalLines = activeLightnings.length * segmentsPerArc;
  const positions = new Float32Array(totalLines * 6);
  const colors = new Float32Array(totalLines * 8);
  const morphologies = new Float32Array(totalLines * 2);
  const ts = new Float32Array(totalLines * 2);

  let count = 0;
  for (const l of activeLightnings) {
    const src = nodeLookup.get(l.sourceId);
    const tgt = nodeLookup.get(l.targetId);
    if (!src || !tgt) continue;

    const [r, g, b] = parseHexColor(l.color);

    for (let s = 0; s < segmentsPerArc; s++) {
      const t1 = s / segmentsPerArc;
      const t2 = (s + 1) / segmentsPerArc;

      const x1 = src.x + (tgt.x - src.x) * t1;
      const y1 = src.y + (tgt.y - src.y) * t1;
      const z1 = (src.z ?? 0) + ((tgt.z ?? 0) - (src.z ?? 0)) * t1;

      const x2 = src.x + (tgt.x - src.x) * t2;
      const y2 = src.y + (tgt.y - src.y) * t2;
      const z2 = (src.z ?? 0) + ((tgt.z ?? 0) - (src.z ?? 0)) * t2;

      positions[count * 6] = x1;
      positions[count * 6 + 1] = y1;
      positions[count * 6 + 2] = z1;
      positions[count * 6 + 3] = x2;
      positions[count * 6 + 4] = y2;
      positions[count * 6 + 5] = z2;

      colors[count * 8] = r * 1.5;
      colors[count * 8 + 1] = g * 1.5;
      colors[count * 8 + 2] = b * 1.5;
      colors[count * 8 + 3] = 0.95;
      colors[count * 8 + 4] = r * 1.5;
      colors[count * 8 + 5] = g * 1.5;
      colors[count * 8 + 6] = b * 1.5;
      colors[count * 8 + 7] = 0.95;

      morphologies[count * 2] = 2.0; // Synaptic lightning mode
      morphologies[count * 2 + 1] = 2.0;

      ts[count * 2] = t1;
      ts[count * 2 + 1] = t2;

      count++;
    }
  }

  if (count > 0) {
    const ePos = gl.getAttribLocation(program, 'a_position');
    const eCol = gl.getAttribLocation(program, 'a_color');
    const eMorph = gl.getAttribLocation(program, 'a_morphology');
    const eT = gl.getAttribLocation(program, 'a_t');

    if (ePos >= 0 && buffers.edgePositionBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgePositionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions.subarray(0, count * 6), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(ePos);
      gl.vertexAttribPointer(ePos, 3, gl.FLOAT, false, 0, 0);
    }

    if (eCol >= 0 && buffers.edgeColorBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgeColorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, colors.subarray(0, count * 8), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(eCol);
      gl.vertexAttribPointer(eCol, 4, gl.FLOAT, false, 0, 0);
    }

    if (eMorph >= 0 && buffers.edgeMorphologyBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgeMorphologyBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, morphologies.subarray(0, count * 2), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(eMorph);
      gl.vertexAttribPointer(eMorph, 1, gl.FLOAT, false, 0, 0);
    }

    if (eT >= 0 && buffers.edgeTBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffers.edgeTBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, ts.subarray(0, count * 2), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(eT);
      gl.vertexAttribPointer(eT, 1, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.LINES, 0, count * 2);

    if (ePos >= 0) gl.disableVertexAttribArray(ePos);
    if (eCol >= 0) gl.disableVertexAttribArray(eCol);
    if (eMorph >= 0) gl.disableVertexAttribArray(eMorph);
    if (eT >= 0) gl.disableVertexAttribArray(eT);
  }

  restoreStandardBlending(gl);
}
