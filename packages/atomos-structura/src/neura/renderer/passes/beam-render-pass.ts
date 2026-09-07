// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type { NeuraEnergyBeam, NeuraNode } from '../../core/neura-store.js';
import { parseHexColor } from '../../math/math3d.js';
import type { NeuraBuffers } from '../neura-buffer-manager.js';
import { BEAM_TRAIL_COUNT } from '../renderer-constants.js';
import { restoreStandardBlending } from '../webgl-context.js';

export interface BeamRenderPassParams {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffers: NeuraBuffers;
  beams: NeuraEnergyBeam[];
  nodeLookup: Map<string, NeuraNode>;
  mvp: Float32Array;
  viewportHeight: number;
  now: number;
}

export function renderBeamPass(params: BeamRenderPassParams): void {
  const { gl, program, buffers, beams, nodeLookup, mvp, viewportHeight, now } = params;

  if (beams.length === 0) return;

  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.depthMask(false);

  gl.useProgram(program);

  const uMvp = gl.getUniformLocation(program, 'u_mvp_matrix');
  const uVh = gl.getUniformLocation(program, 'u_viewport_height');

  gl.uniformMatrix4fv(uMvp, false, mvp);
  gl.uniform1f(uVh, viewportHeight || 600);

  const maxParticles = beams.length * BEAM_TRAIL_COUNT;
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 4);
  const sizes = new Float32Array(maxParticles);

  let particleCount = 0;

  for (const beam of beams) {
    const source = nodeLookup.get(beam.sourceId);
    const target = nodeLookup.get(beam.targetId);
    if (!source || !target) continue;

    const elapsed = now * 1000 - beam.startedAt;
    const progress = Math.min(1.0, elapsed / beam.durationMs);
    const [br, bg, bb] = parseHexColor(beam.color);

    for (let t = 0; t < BEAM_TRAIL_COUNT; t++) {
      const trailOffset = t * 0.06;
      const p = Math.max(0, progress - trailOffset);

      const px = source.x + (target.x - source.x) * p;
      const py = source.y + (target.y - source.y) * p;
      const pz = (source.z ?? 0) + ((target.z ?? 0) - (source.z ?? 0)) * p;

      positions[particleCount * 3] = px;
      positions[particleCount * 3 + 1] = py;
      positions[particleCount * 3 + 2] = pz;

      const trailFade = 1.0 - t / BEAM_TRAIL_COUNT;
      colors[particleCount * 4] = br;
      colors[particleCount * 4 + 1] = bg;
      colors[particleCount * 4 + 2] = bb;
      colors[particleCount * 4 + 3] = trailFade * 0.9;

      sizes[particleCount] = 6.0 * trailFade + 2.0;

      particleCount++;
    }
  }

  if (particleCount === 0) {
    restoreStandardBlending(gl);
    return;
  }

  const aPos = gl.getAttribLocation(program, 'a_position');
  const aColor = gl.getAttribLocation(program, 'a_color');
  const aSize = gl.getAttribLocation(program, 'a_size_attr');

  if (aPos >= 0 && buffers.beamPositionBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.beamPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions.subarray(0, particleCount * 3), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  }

  if (aColor >= 0 && buffers.beamColorBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.beamColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors.subarray(0, particleCount * 4), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
  }

  if (aSize >= 0 && buffers.beamSizeBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.beamSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes.subarray(0, particleCount), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);
  }

  gl.drawArrays(gl.POINTS, 0, particleCount);

  if (aPos >= 0) gl.disableVertexAttribArray(aPos);
  if (aColor >= 0) gl.disableVertexAttribArray(aColor);
  if (aSize >= 0) gl.disableVertexAttribArray(aSize);

  restoreStandardBlending(gl);
}
