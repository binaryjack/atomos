// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import type {
  NeuraNode,
  NeuraEdge,
  NeuraEnergyBeam,
  NeuraViewport,
  ThinkingPulseState,
  CognitiveEmotion,
  SynapticLightningState,
  TurgorPulseState,
} from '../core/neura-store.js';
import { nodeVertexShaderSource, nodeFragmentShaderSource } from '../shaders/node.shaders.js';
import { edgeVertexShaderSource, edgeFragmentShaderSource } from '../shaders/edge.shaders.js';
import { beamVertexShaderSource, beamFragmentShaderSource } from '../shaders/beam.shaders.js';
import { mat4Create, mat4Perspective, mat4LookAt, mat4Multiply, type Mat4 } from '../math/math3d.js';
import {
  type ShaderTheme,
  initWebGLContext,
  applyThemeClearColor,
  THEME_MODE_ID,
} from './webgl-context.js';
import { ShaderProgramFactory } from './shader-program-factory.js';
import {
  type NeuraBuffers,
  createNeuraBuffers,
  deleteNeuraBuffers,
} from './neura-buffer-manager.js';
import { renderNodePass } from './passes/node-render-pass.js';
import { renderEdgePass } from './passes/edge-render-pass.js';
import { renderLightningPass } from './passes/lightning-render-pass.js';
import { renderBeamPass } from './passes/beam-render-pass.js';

export type { ShaderTheme };

/**
 * WebGLEngine Facade
 * High-performance 3D WebGL orchestrator delegating compilation, memory allocation,
 * and modular render passes.
 */
export class WebGLEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private buffers: NeuraBuffers;

  // Shader Programs
  private nodeProgram: WebGLProgram | null = null;
  private edgeProgram: WebGLProgram | null = null;
  private beamProgram: WebGLProgram | null = null;

  private animationFrameId: number | null = null;
  private theme: ShaderTheme = 'cyber';

  // Projection Matrices
  private projMatrix: Mat4 = mat4Create();
  private viewMatrix: Mat4 = mat4Create();
  private mvpMatrix: Mat4 = mat4Create();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = initWebGLContext(canvas);
    this.initPrograms();
    this.buffers = createNeuraBuffers(this.gl);
    this.setTheme(this.theme);
  }

  private initPrograms(): void {
    this.nodeProgram = ShaderProgramFactory.createProgram(
      this.gl,
      nodeVertexShaderSource,
      nodeFragmentShaderSource
    );
    if (!this.nodeProgram) throw new Error('Failed to create node program');

    this.edgeProgram = ShaderProgramFactory.createProgram(
      this.gl,
      edgeVertexShaderSource,
      edgeFragmentShaderSource
    );
    if (!this.edgeProgram) throw new Error('Failed to create edge program');

    this.beamProgram = ShaderProgramFactory.createProgram(
      this.gl,
      beamVertexShaderSource,
      beamFragmentShaderSource
    );
    if (!this.beamProgram) throw new Error('Failed to create beam program');
  }

  public setTheme(theme: ShaderTheme): void {
    this.theme = theme;
    applyThemeClearColor(this.gl, theme);
  }

  public getTheme(): ShaderTheme {
    return this.theme;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  public computeMVPMatrix(viewport: NeuraViewport): Float32Array {
    const aspect = (this.canvas.width || 800) / (this.canvas.height || 600);
    mat4Perspective(this.projMatrix, (45 * Math.PI) / 180, aspect, 1, 20000);

    const zoom = Math.max(0.01, viewport.zoom);
    const radius = 950 / zoom;
    const yaw = viewport.yaw ?? 0;
    const pitch = Math.max(-1.45, Math.min(1.45, viewport.pitch ?? 0));

    const targetX = viewport.x;
    const targetY = viewport.y;
    const targetZ = 0;

    const eyeX = targetX + radius * Math.cos(pitch) * Math.sin(yaw);
    const eyeY = targetY + radius * Math.sin(pitch);
    const eyeZ = targetZ + radius * Math.cos(pitch) * Math.cos(yaw);

    mat4LookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [targetX, targetY, targetZ], [0, 1, 0]);
    mat4Multiply(this.mvpMatrix, this.projMatrix, this.viewMatrix);

    return this.mvpMatrix;
  }

  public render(
    nodes: NeuraNode[],
    edges: NeuraEdge[],
    viewport: NeuraViewport,
    activeNodeIds: Set<string>,
    activeEdgeIds: Set<string>,
    hasActiveFocus: boolean,
    energyBeams: NeuraEnergyBeam[] = [],
    cognitiveCharge = 0.0,
    thinkingPulse: ThinkingPulseState | null = null,
    cognitiveEmotion: CognitiveEmotion = 'harmonic_focus',
    emotionIntensity = 0.8,
    brainWaveFreq = 10.0,
    brainWaveAmp = 0.5,
    synapticLightnings: SynapticLightningState[] = [],
    turgorPulses: Record<string, TurgorPulseState> = {}
  ): void {
    if (!this.nodeProgram || !this.edgeProgram || !this.beamProgram) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const modeId = THEME_MODE_ID[this.theme] ?? 4;
    const mvp = this.computeMVPMatrix(viewport);
    const now = performance.now() / 1000.0;
    const nowMs = performance.now();
    const vh = this.canvas.height || 600;

    const nodeLookup = new Map<string, NeuraNode>();
    for (const node of nodes) {
      nodeLookup.set(node.id, node);
    }

    renderEdgePass({
      gl: this.gl,
      program: this.edgeProgram,
      buffers: this.buffers,
      edges,
      nodeLookup,
      mvp,
      now,
      modeId,
      theme: this.theme,
      activeEdgeIds,
      hasActiveFocus,
      cognitiveCharge,
      thinkingPulse,
      cognitiveEmotion,
      brainWaveFreq,
      brainWaveAmp,
    });

    renderNodePass({
      gl: this.gl,
      program: this.nodeProgram,
      buffers: this.buffers,
      nodes,
      mvp,
      viewportHeight: vh,
      now,
      nowMs,
      modeId,
      theme: this.theme,
      activeNodeIds,
      hasActiveFocus,
      cognitiveCharge,
      thinkingPulse,
      cognitiveEmotion,
      emotionIntensity,
      brainWaveFreq,
      brainWaveAmp,
      turgorPulses,
    });

    renderBeamPass({
      gl: this.gl,
      program: this.beamProgram,
      buffers: this.buffers,
      beams: energyBeams,
      nodeLookup,
      mvp,
      viewportHeight: vh,
      now,
    });

    renderLightningPass({
      gl: this.gl,
      program: this.edgeProgram,
      buffers: this.buffers,
      lightnings: synapticLightnings,
      nodeLookup,
      now,
    });
  }

  public startLoop(renderCallback: () => void): void {
    const loop = () => {
      renderCallback();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.stopLoop();
    deleteNeuraBuffers(this.gl, this.buffers);

    if (this.nodeProgram) this.gl.deleteProgram(this.nodeProgram);
    if (this.edgeProgram) this.gl.deleteProgram(this.edgeProgram);
    if (this.beamProgram) this.gl.deleteProgram(this.beamProgram);
  }
}
