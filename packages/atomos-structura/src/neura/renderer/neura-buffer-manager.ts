export interface NeuraBuffers {
  nodePositionBuffer: WebGLBuffer | null;
  nodeColorBuffer: WebGLBuffer | null;
  nodeSizeBuffer: WebGLBuffer | null;
  nodeActivityBuffer: WebGLBuffer | null;
  nodeHaloColorBuffer: WebGLBuffer | null;
  edgePositionBuffer: WebGLBuffer | null;
  edgeColorBuffer: WebGLBuffer | null;
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
    edgePositionBuffer: gl.createBuffer(),
    edgeColorBuffer: gl.createBuffer(),
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
  if (buffers.edgePositionBuffer) gl.deleteBuffer(buffers.edgePositionBuffer);
  if (buffers.edgeColorBuffer) gl.deleteBuffer(buffers.edgeColorBuffer);
  if (buffers.beamPositionBuffer) gl.deleteBuffer(buffers.beamPositionBuffer);
  if (buffers.beamColorBuffer) gl.deleteBuffer(buffers.beamColorBuffer);
  if (buffers.beamSizeBuffer) gl.deleteBuffer(buffers.beamSizeBuffer);
}
