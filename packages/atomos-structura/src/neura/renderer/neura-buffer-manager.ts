// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

export interface NeuraBuffers {
  // Node buffers
  nodePositionBuffer: WebGLBuffer | null;
  nodeColorBuffer: WebGLBuffer | null;
  nodeSizeBuffer: WebGLBuffer | null;
  nodeActivityBuffer: WebGLBuffer | null;
  nodeHaloColorBuffer: WebGLBuffer | null;
  nodeMorphologyBuffer: WebGLBuffer | null;
  nodeTurgorBuffer: WebGLBuffer | null;

  // Edge buffers
  edgePositionBuffer: WebGLBuffer | null;
  edgeColorBuffer: WebGLBuffer | null;
  edgeMorphologyBuffer: WebGLBuffer | null;
  edgeTBuffer: WebGLBuffer | null;

  // Beam buffers
  beamPositionBuffer: WebGLBuffer | null;
  beamColorBuffer: WebGLBuffer | null;
  beamSizeBuffer: WebGLBuffer | null;
}

export function createNeuraBuffers(gl: WebGLRenderingContext): NeuraBuffers {
  return {
    nodePositionBuffer: gl.createBuffer(),
    nodeColorBuffer: gl.createBuffer(),
    nodeSizeBuffer: gl.createBuffer(),
    nodeActivityBuffer: gl.createBuffer(),
    nodeHaloColorBuffer: gl.createBuffer(),
    nodeMorphologyBuffer: gl.createBuffer(),
    nodeTurgorBuffer: gl.createBuffer(),

    edgePositionBuffer: gl.createBuffer(),
    edgeColorBuffer: gl.createBuffer(),
    edgeMorphologyBuffer: gl.createBuffer(),
    edgeTBuffer: gl.createBuffer(),

    beamPositionBuffer: gl.createBuffer(),
    beamColorBuffer: gl.createBuffer(),
    beamSizeBuffer: gl.createBuffer(),
  };
}

export function deleteNeuraBuffers(gl: WebGLRenderingContext, buffers: NeuraBuffers): void {
  if (buffers.nodePositionBuffer) gl.deleteBuffer(buffers.nodePositionBuffer);
  if (buffers.nodeColorBuffer) gl.deleteBuffer(buffers.nodeColorBuffer);
  if (buffers.nodeSizeBuffer) gl.deleteBuffer(buffers.nodeSizeBuffer);
  if (buffers.nodeActivityBuffer) gl.deleteBuffer(buffers.nodeActivityBuffer);
  if (buffers.nodeHaloColorBuffer) gl.deleteBuffer(buffers.nodeHaloColorBuffer);
  if (buffers.nodeMorphologyBuffer) gl.deleteBuffer(buffers.nodeMorphologyBuffer);
  if (buffers.nodeTurgorBuffer) gl.deleteBuffer(buffers.nodeTurgorBuffer);

  if (buffers.edgePositionBuffer) gl.deleteBuffer(buffers.edgePositionBuffer);
  if (buffers.edgeColorBuffer) gl.deleteBuffer(buffers.edgeColorBuffer);
  if (buffers.edgeMorphologyBuffer) gl.deleteBuffer(buffers.edgeMorphologyBuffer);
  if (buffers.edgeTBuffer) gl.deleteBuffer(buffers.edgeTBuffer);

  if (buffers.beamPositionBuffer) gl.deleteBuffer(buffers.beamPositionBuffer);
  if (buffers.beamColorBuffer) gl.deleteBuffer(buffers.beamColorBuffer);
  if (buffers.beamSizeBuffer) gl.deleteBuffer(buffers.beamSizeBuffer);
}
