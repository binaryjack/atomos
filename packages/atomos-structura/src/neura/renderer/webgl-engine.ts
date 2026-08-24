import type {
  NeuraNode,
  NeuraEdge,
  NeuraEnergyBeam,
  NeuraViewport,
  NodeActivityState,
} from '../core/neura-store.js';
import { STATE_HALO_COLORS } from '../core/neura-store.js';

export type ShaderTheme = 'normal' | 'dark' | 'neon' | 'pulse' | 'cyber';

// ---------------------------------------------------------------------------
// 4x4 Column-Major Matrix Math Helpers
// ---------------------------------------------------------------------------

function mat4Create(): Float32Array {
  const out = new Float32Array(16);
  out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
  return out;
}

function mat4Perspective(out: Float32Array, fovy: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = (2 * far * near) * nf;
  out[15] = 0;
  return out;
}

function mat4LookAt(out: Float32Array, eye: [number, number, number], center: [number, number, number], up: [number, number, number]): Float32Array {
  let x0: number, x1: number, x2: number;
  let y0: number, y1: number, y2: number;
  let z0: number, z1: number, z2: number;
  let len: number;
  const eyex = eye[0], eyey = eye[1], eyez = eye[2];
  const upx = up[0], upy = up[1], upz = up[2];
  const centerx = center[0], centery = center[1], centerz = center[2];

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len; z1 *= len; z2 *= len;

  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);
  if (!len) {
    x0 = 0; x1 = 0; x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len; x1 *= len; x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);
  if (!len) {
    y0 = 0; y1 = 0; y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len; y1 *= len; y2 *= len;
  }

  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

function mat4Multiply(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

// ---------------------------------------------------------------------------
// GLSL Shader Sources
// ---------------------------------------------------------------------------

/** Node vertex shader with activity-driven pulsation */
const nodeVertexShaderSource = `
  precision mediump float;
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_size_attr;
  attribute float a_activity;
  attribute vec3 a_halo_color;

  uniform mat4 u_mvp_matrix;
  uniform float u_viewport_height;
  uniform float u_time;

  varying vec4 v_color;
  varying float v_depth;
  varying float v_activity;
  varying vec3 v_halo_color;

  void main() {
    vec4 clipPos = u_mvp_matrix * vec4(a_position, 1.0);
    gl_Position = clipPos;

    // Pulse modulation: active nodes grow 20%-50% via sinusoidal breathing
    float pulseScale = 1.0 + a_activity * (0.2 + 0.3 * (0.5 + 0.5 * sin(u_time * 4.0)));
    float baseSize = clamp(a_size_attr, 3.0, 20.0) * pulseScale;
    float pointScale = (baseSize * u_viewport_height * 0.75) / max(0.1, clipPos.w);
    gl_PointSize = clamp(pointScale, 2.5, 48.0);

    v_color = a_color;
    v_depth = clamp((clipPos.z / max(0.1, clipPos.w)) * 0.5 + 0.5, 0.0, 1.0);
    v_activity = a_activity;
    v_halo_color = a_halo_color;
  }
`;

/** Node fragment shader with coronal halo effect */
const nodeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying float v_depth;
  varying float v_activity;
  varying vec3 v_halo_color;
  uniform int u_theme_mode;
  uniform float u_time;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) {
      discard;
    }

    // Cosmic Fog: gently fade distant nodes in depth
    float fog = 1.0 - smoothstep(0.45, 1.0, v_depth) * 0.5;

    // Base color with theme glow
    vec4 baseColor;
    if (u_theme_mode == 2 || u_theme_mode == 3 || u_theme_mode == 4) {
      float glow = 1.0 - smoothstep(0.25, 0.5, dist);
      baseColor = vec4(v_color.rgb * (1.0 + glow * 0.4), v_color.a * glow * fog);
    } else {
      baseColor = vec4(v_color.rgb, v_color.a * fog);
    }

    // Coronal Halo: bright inner core + pulsating outer corona ring
    if (v_activity > 0.1) {
      float haloIntensity = v_activity;

      // Inner core brightening
      float innerGlow = smoothstep(0.35, 0.0, dist) * haloIntensity;

      // Corona ring — bright band between inner core and outer edge
      float coronaRing = smoothstep(0.5, 0.3, dist) * smoothstep(0.15, 0.3, dist) * haloIntensity;
      float pulse = 0.7 + 0.3 * sin(u_time * 6.0);

      vec3 coronaColor = v_halo_color * pulse;

      baseColor.rgb += coronaColor * coronaRing * 0.6;
      baseColor.rgb += vec3(1.0) * innerGlow * 0.3;
      baseColor.a = max(baseColor.a, haloIntensity * 0.9);
    }

    gl_FragColor = baseColor;
  }
`;

const edgeVertexShaderSource = `
  precision mediump float;
  attribute vec3 a_position;
  attribute vec4 a_color;

  uniform mat4 u_mvp_matrix;

  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;

  void main() {
    vec4 clipPos = u_mvp_matrix * vec4(a_position, 1.0);
    gl_Position = clipPos;

    v_color = a_color;
    v_world_pos = a_position;
    v_depth = clamp((clipPos.z / max(0.1, clipPos.w)) * 0.5 + 0.5, 0.0, 1.0);
  }
`;

const edgeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  uniform float u_time;
  uniform int u_theme_mode;

  void main() {
    float pulseSpeed = (u_theme_mode == 3 || u_theme_mode == 4) ? 4.0 : 2.0;
    float pulse = 0.5 + 0.5 * sin(u_time * pulseSpeed + (v_world_pos.x + v_world_pos.y + v_world_pos.z) * 0.02);
    float fog = 1.0 - smoothstep(0.45, 1.0, v_depth) * 0.55;

    if (u_theme_mode == 4) { // Cyber mode
      gl_FragColor = vec4(v_color.rgb * (0.8 + 0.3 * pulse), v_color.a * (0.35 + 0.45 * pulse) * fog);
    } else {
      gl_FragColor = vec4(v_color.rgb, v_color.a * (0.4 + 0.4 * pulse) * fog);
    }
  }
`;

/** Beam particle vertex shader — renders glowing energy orbs traveling along edges */
const beamVertexShaderSource = `
  precision mediump float;
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_size_attr;

  uniform mat4 u_mvp_matrix;
  uniform float u_viewport_height;

  varying vec4 v_color;

  void main() {
    vec4 clipPos = u_mvp_matrix * vec4(a_position, 1.0);
    gl_Position = clipPos;

    float pointScale = (a_size_attr * u_viewport_height * 0.75) / max(0.1, clipPos.w);
    gl_PointSize = clamp(pointScale, 3.0, 40.0);

    v_color = a_color;
  }
`;

/** Beam particle fragment shader — radial gradient with soft glow for additive blending */
const beamFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) {
      discard;
    }

    // Radial intensity — bright center, soft falloff
    float intensity = 1.0 - smoothstep(0.0, 0.5, dist);
    float glow = intensity * intensity;

    gl_FragColor = vec4(v_color.rgb * glow, v_color.a * glow);
  }
`;

// ---------------------------------------------------------------------------
// Theme Constants
// ---------------------------------------------------------------------------

const THEME_BG: Record<ShaderTheme, [number, number, number, number]> = {
  normal: [0.05, 0.05, 0.08, 1.0],
  dark: [0.01, 0.01, 0.02, 1.0],
  neon: [0.02, 0.02, 0.05, 1.0],
  pulse: [0.03, 0.01, 0.06, 1.0],
  cyber: [0.00, 0.03, 0.06, 1.0],
};

const THEME_MODE_ID: Record<ShaderTheme, number> = {
  normal: 0,
  dark: 1,
  neon: 2,
  pulse: 3,
  cyber: 4,
};

/** Number of trailing particles per energy beam */
const BEAM_TRAIL_COUNT = 5;

// ---------------------------------------------------------------------------
// Hex color parsing utility
// ---------------------------------------------------------------------------

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    return [
      parseInt(clean.substring(0, 2), 16) / 255,
      parseInt(clean.substring(2, 4), 16) / 255,
      parseInt(clean.substring(4, 6), 16) / 255,
    ];
  }
  return [0.0, 0.83, 1.0]; // default cyan
}

// ---------------------------------------------------------------------------
// WebGL Engine
// ---------------------------------------------------------------------------

export class WebGLEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;

  // Node render resources
  private nodeProgram: WebGLProgram | null = null;
  private nodePositionBuffer: WebGLBuffer | null = null;
  private nodeColorBuffer: WebGLBuffer | null = null;
  private nodeSizeBuffer: WebGLBuffer | null = null;
  private nodeActivityBuffer: WebGLBuffer | null = null;
  private nodeHaloColorBuffer: WebGLBuffer | null = null;

  // Edge render resources
  private edgeProgram: WebGLProgram | null = null;
  private edgePositionBuffer: WebGLBuffer | null = null;
  private edgeColorBuffer: WebGLBuffer | null = null;

  // Beam render resources
  private beamProgram: WebGLProgram | null = null;
  private beamPositionBuffer: WebGLBuffer | null = null;
  private beamColorBuffer: WebGLBuffer | null = null;
  private beamSizeBuffer: WebGLBuffer | null = null;

  private animationFrameId: number | null = null;
  private theme: ShaderTheme = 'cyber';

  private projMatrix = mat4Create();
  private viewMatrix = mat4Create();
  private mvpMatrix = mat4Create();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      throw new Error('WebGL is not supported by your browser.');
    }
    this.gl = gl;
    this.init();
  }

  public setTheme(theme: ShaderTheme) {
    this.theme = theme;
    const bg = THEME_BG[theme] || THEME_BG.normal;
    this.gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
  }

  public getTheme(): ShaderTheme {
    return this.theme;
  }

  private init() {
    const bg = THEME_BG[this.theme];
    this.gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);

    // Compile shader programs
    this.nodeProgram = this.createProgram(nodeVertexShaderSource, nodeFragmentShaderSource);
    if (!this.nodeProgram) throw new Error('Failed to create node program');

    this.edgeProgram = this.createProgram(edgeVertexShaderSource, edgeFragmentShaderSource);
    if (!this.edgeProgram) throw new Error('Failed to create edge program');

    this.beamProgram = this.createProgram(beamVertexShaderSource, beamFragmentShaderSource);
    if (!this.beamProgram) throw new Error('Failed to create beam program');

    // Node buffers
    this.nodePositionBuffer = this.gl.createBuffer();
    this.nodeColorBuffer = this.gl.createBuffer();
    this.nodeSizeBuffer = this.gl.createBuffer();
    this.nodeActivityBuffer = this.gl.createBuffer();
    this.nodeHaloColorBuffer = this.gl.createBuffer();

    // Edge buffers
    this.edgePositionBuffer = this.gl.createBuffer();
    this.edgeColorBuffer = this.gl.createBuffer();

    // Beam buffers
    this.beamPositionBuffer = this.gl.createBuffer();
    this.beamColorBuffer = this.gl.createBuffer();
    this.beamSizeBuffer = this.gl.createBuffer();
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error(this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  public resize(width: number, height: number) {
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

    // Target pan center in world coordinates
    const targetX = viewport.x;
    const targetY = viewport.y;
    const targetZ = 0;

    // Eye position calculated from spherical coordinates around target
    const eyeX = targetX + radius * Math.cos(pitch) * Math.sin(yaw);
    const eyeY = targetY + radius * Math.sin(pitch);
    const eyeZ = targetZ + radius * Math.cos(pitch) * Math.cos(yaw);

    mat4LookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [targetX, targetY, targetZ], [0, 1, 0]);
    mat4Multiply(this.mvpMatrix, this.projMatrix, this.viewMatrix);

    return this.mvpMatrix;
  }

  // ---------------------------------------------------------------------------
  // Main Render Pass
  // ---------------------------------------------------------------------------

  public render(
    nodes: NeuraNode[],
    edges: NeuraEdge[],
    viewport: NeuraViewport,
    activeNodeIds: Set<string>,
    activeEdgeIds: Set<string>,
    hasActiveFocus: boolean,
    energyBeams: NeuraEnergyBeam[] = []
  ) {
    if (!this.nodeProgram || !this.edgeProgram || !this.beamProgram) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const modeId = THEME_MODE_ID[this.theme] ?? 4;
    const mvp = this.computeMVPMatrix(viewport);
    const now = performance.now() / 1000.0;

    // Build node lookup for edge and beam rendering
    const nodeLookup = new Map<string, NeuraNode>();
    for (const node of nodes) {
      nodeLookup.set(node.id, node);
    }

    this.renderEdges(edges, nodeLookup, mvp, now, modeId, activeEdgeIds, hasActiveFocus);
    this.renderNodes(nodes, mvp, now, modeId, activeNodeIds, hasActiveFocus);
    this.renderBeams(energyBeams, nodeLookup, mvp, now);
  }

  // ---------------------------------------------------------------------------
  // Edge Rendering
  // ---------------------------------------------------------------------------

  private renderEdges(
    edges: NeuraEdge[],
    nodeLookup: Map<string, NeuraNode>,
    mvp: Float32Array,
    now: number,
    modeId: number,
    activeEdgeIds: Set<string>,
    hasActiveFocus: boolean
  ) {
    if (!this.edgeProgram) return;

    this.gl.useProgram(this.edgeProgram);

    const eMvp = this.gl.getUniformLocation(this.edgeProgram, 'u_mvp_matrix');
    const eTime = this.gl.getUniformLocation(this.edgeProgram, 'u_time');
    const eTheme = this.gl.getUniformLocation(this.edgeProgram, 'u_theme_mode');

    this.gl.uniformMatrix4fv(eMvp, false, mvp);
    this.gl.uniform1f(eTime, now);
    this.gl.uniform1i(eTheme, modeId);

    const edgePositions = new Float32Array(edges.length * 6);
    const edgeColors = new Float32Array(edges.length * 8);

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
        if (this.theme === 'neon') {
          r = 0.2; g = 1.0; b = 0.4; a = 0.25;
        } else if (this.theme === 'pulse') {
          r = 0.8; g = 0.2; b = 0.9; a = 0.3;
        }

        if (hasActiveFocus) {
          if (activeEdgeIds.has(edge.id)) {
            r = 0.9; g = 0.95; b = 1.0; a = 0.95;
          } else {
            a = 0.02;
          }
        }

        // Vert 1
        edgeColors[edgeCount * 8] = r; edgeColors[edgeCount * 8 + 1] = g; edgeColors[edgeCount * 8 + 2] = b; edgeColors[edgeCount * 8 + 3] = a;
        // Vert 2
        edgeColors[edgeCount * 8 + 4] = r; edgeColors[edgeCount * 8 + 5] = g; edgeColors[edgeCount * 8 + 6] = b; edgeColors[edgeCount * 8 + 7] = a;

        edgeCount++;
      }
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.edgePositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, edgePositions, this.gl.DYNAMIC_DRAW);
    const ePosAttr = this.gl.getAttribLocation(this.edgeProgram, 'a_position');
    this.gl.enableVertexAttribArray(ePosAttr);
    this.gl.vertexAttribPointer(ePosAttr, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.edgeColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, edgeColors, this.gl.DYNAMIC_DRAW);
    const eColorAttr = this.gl.getAttribLocation(this.edgeProgram, 'a_color');
    this.gl.enableVertexAttribArray(eColorAttr);
    this.gl.vertexAttribPointer(eColorAttr, 4, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.LINES, 0, edgeCount * 2);
  }

  // ---------------------------------------------------------------------------
  // Node Rendering with Activity & Halo
  // ---------------------------------------------------------------------------

  private renderNodes(
    nodes: NeuraNode[],
    mvp: Float32Array,
    now: number,
    modeId: number,
    activeNodeIds: Set<string>,
    hasActiveFocus: boolean
  ) {
    if (!this.nodeProgram) return;

    this.gl.useProgram(this.nodeProgram);

    const uMvp = this.gl.getUniformLocation(this.nodeProgram, 'u_mvp_matrix');
    const uVh = this.gl.getUniformLocation(this.nodeProgram, 'u_viewport_height');
    const uTheme = this.gl.getUniformLocation(this.nodeProgram, 'u_theme_mode');
    const uTime = this.gl.getUniformLocation(this.nodeProgram, 'u_time');

    this.gl.uniformMatrix4fv(uMvp, false, mvp);
    this.gl.uniform1f(uVh, this.canvas.height || 600);
    this.gl.uniform1i(uTheme, modeId);
    this.gl.uniform1f(uTime, now);

    const positions = new Float32Array(nodes.length * 3);
    const colors = new Float32Array(nodes.length * 4);
    const sizes = new Float32Array(nodes.length);
    const activities = new Float32Array(nodes.length);
    const haloColors = new Float32Array(nodes.length * 3);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      positions[i * 3] = node.x;
      positions[i * 3 + 1] = node.y;
      positions[i * 3 + 2] = node.z ?? 0;

      const [r, g, b] = this.getNodeColor(node);

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

      // Boost brightness for active nodes even outside hover/select focus
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

      // Halo color from node state
      const state: NodeActivityState = node.state ?? 'idle';
      const halo = STATE_HALO_COLORS[state];
      haloColors[i * 3] = halo[0];
      haloColors[i * 3 + 1] = halo[1];
      haloColors[i * 3 + 2] = halo[2];
    }

    // Position buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodePositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.DYNAMIC_DRAW);
    const aPosition = this.gl.getAttribLocation(this.nodeProgram, 'a_position');
    this.gl.enableVertexAttribArray(aPosition);
    this.gl.vertexAttribPointer(aPosition, 3, this.gl.FLOAT, false, 0, 0);

    // Color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodeColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.DYNAMIC_DRAW);
    const aColor = this.gl.getAttribLocation(this.nodeProgram, 'a_color');
    this.gl.enableVertexAttribArray(aColor);
    this.gl.vertexAttribPointer(aColor, 4, this.gl.FLOAT, false, 0, 0);

    // Size buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodeSizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.DYNAMIC_DRAW);
    const aSizeAttr = this.gl.getAttribLocation(this.nodeProgram, 'a_size_attr');
    this.gl.enableVertexAttribArray(aSizeAttr);
    this.gl.vertexAttribPointer(aSizeAttr, 1, this.gl.FLOAT, false, 0, 0);

    // Activity buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodeActivityBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, activities, this.gl.DYNAMIC_DRAW);
    const aActivity = this.gl.getAttribLocation(this.nodeProgram, 'a_activity');
    this.gl.enableVertexAttribArray(aActivity);
    this.gl.vertexAttribPointer(aActivity, 1, this.gl.FLOAT, false, 0, 0);

    // Halo color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodeHaloColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, haloColors, this.gl.DYNAMIC_DRAW);
    const aHaloColor = this.gl.getAttribLocation(this.nodeProgram, 'a_halo_color');
    this.gl.enableVertexAttribArray(aHaloColor);
    this.gl.vertexAttribPointer(aHaloColor, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.POINTS, 0, nodes.length);
  }

  // ---------------------------------------------------------------------------
  // Energy Beam Rendering (Additive Blending)
  // ---------------------------------------------------------------------------

  private renderBeams(
    beams: NeuraEnergyBeam[],
    nodeLookup: Map<string, NeuraNode>,
    mvp: Float32Array,
    now: number
  ) {
    if (!this.beamProgram || beams.length === 0) return;

    // Switch to additive blending for luminous beam effect
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
    this.gl.depthMask(false);

    this.gl.useProgram(this.beamProgram);

    const uMvp = this.gl.getUniformLocation(this.beamProgram, 'u_mvp_matrix');
    const uVh = this.gl.getUniformLocation(this.beamProgram, 'u_viewport_height');

    this.gl.uniformMatrix4fv(uMvp, false, mvp);
    this.gl.uniform1f(uVh, this.canvas.height || 600);

    // Maximum particles = beams * trailing particles
    const maxParticles = beams.length * BEAM_TRAIL_COUNT;
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 4);
    const sizes = new Float32Array(maxParticles);

    let particleCount = 0;

    for (const beam of beams) {
      const source = nodeLookup.get(beam.sourceId);
      const target = nodeLookup.get(beam.targetId);
      if (!source || !target) continue;

      const elapsed = (now * 1000 - beam.startedAt);
      const progress = Math.min(1.0, elapsed / beam.durationMs);
      const [br, bg, bb] = parseHexColor(beam.color);

      // Generate trailing particles behind the beam head
      for (let t = 0; t < BEAM_TRAIL_COUNT; t++) {
        const trailOffset = t * 0.06; // spacing between trail particles
        const p = Math.max(0, progress - trailOffset);

        // Interpolate position along source → target
        const px = source.x + (target.x - source.x) * p;
        const py = source.y + (target.y - source.y) * p;
        const pz = (source.z ?? 0) + ((target.z ?? 0) - (source.z ?? 0)) * p;

        positions[particleCount * 3] = px;
        positions[particleCount * 3 + 1] = py;
        positions[particleCount * 3 + 2] = pz;

        // Trail particles fade and shrink behind the head
        const trailFade = 1.0 - (t / BEAM_TRAIL_COUNT);
        colors[particleCount * 4] = br;
        colors[particleCount * 4 + 1] = bg;
        colors[particleCount * 4 + 2] = bb;
        colors[particleCount * 4 + 3] = trailFade * 0.9;

        // Head is largest, trail particles shrink
        sizes[particleCount] = 6.0 * trailFade + 2.0;

        particleCount++;
      }
    }

    if (particleCount === 0) {
      this.restoreBlending();
      return;
    }

    // Position buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.beamPositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions.subarray(0, particleCount * 3), this.gl.DYNAMIC_DRAW);
    const aPos = this.gl.getAttribLocation(this.beamProgram, 'a_position');
    this.gl.enableVertexAttribArray(aPos);
    this.gl.vertexAttribPointer(aPos, 3, this.gl.FLOAT, false, 0, 0);

    // Color buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.beamColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, colors.subarray(0, particleCount * 4), this.gl.DYNAMIC_DRAW);
    const aColor = this.gl.getAttribLocation(this.beamProgram, 'a_color');
    this.gl.enableVertexAttribArray(aColor);
    this.gl.vertexAttribPointer(aColor, 4, this.gl.FLOAT, false, 0, 0);

    // Size buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.beamSizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes.subarray(0, particleCount), this.gl.DYNAMIC_DRAW);
    const aSize = this.gl.getAttribLocation(this.beamProgram, 'a_size_attr');
    this.gl.enableVertexAttribArray(aSize);
    this.gl.vertexAttribPointer(aSize, 1, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.POINTS, 0, particleCount);

    // Restore standard blending
    this.restoreBlending();
  }

  /** Restore standard alpha blending after beam additive pass */
  private restoreBlending() {
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.gl.depthMask(true);
  }

  // ---------------------------------------------------------------------------
  // Node Color Helpers
  // ---------------------------------------------------------------------------

  private getNodeColor(node: NeuraNode): [number, number, number] {
    if (
      node.metadata?.color &&
      typeof node.metadata.color === 'string' &&
      (node.metadata.color as string).startsWith('#')
    ) {
      const hex = (node.metadata.color as string).replace('#', '');
      if (hex.length === 6) {
        return [
          parseInt(hex.substring(0, 2), 16) / 255,
          parseInt(hex.substring(2, 4), 16) / 255,
          parseInt(hex.substring(4, 6), 16) / 255,
        ];
      }
    }
    return this.getThemeColor(node.appartenanceId);
  }

  private getThemeColor(id: string): [number, number, number] {
    const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
    if (this.theme === 'cyber') {
      const palettes: [number, number, number][] = [
        [0.0, 0.94, 1.0],     // cyan
        [0.0, 0.47, 1.0],     // cobalt
        [0.55, 0.36, 0.96],   // indigo
        [0.06, 0.72, 0.51],   // emerald
      ];
      return palettes[Math.abs(hash) % palettes.length]!;
    }
    if (this.theme === 'neon') {
      const palettes: [number, number, number][] = [
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

  // ---------------------------------------------------------------------------
  // Loop Control
  // ---------------------------------------------------------------------------

  public startLoop(renderCallback: () => void) {
    const loop = () => {
      renderCallback();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  public stopLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy() {
    this.stopLoop();
    // Node resources
    if (this.nodeProgram) this.gl.deleteProgram(this.nodeProgram);
    if (this.nodePositionBuffer) this.gl.deleteBuffer(this.nodePositionBuffer);
    if (this.nodeColorBuffer) this.gl.deleteBuffer(this.nodeColorBuffer);
    if (this.nodeSizeBuffer) this.gl.deleteBuffer(this.nodeSizeBuffer);
    if (this.nodeActivityBuffer) this.gl.deleteBuffer(this.nodeActivityBuffer);
    if (this.nodeHaloColorBuffer) this.gl.deleteBuffer(this.nodeHaloColorBuffer);
    // Edge resources
    if (this.edgeProgram) this.gl.deleteProgram(this.edgeProgram);
    if (this.edgePositionBuffer) this.gl.deleteBuffer(this.edgePositionBuffer);
    if (this.edgeColorBuffer) this.gl.deleteBuffer(this.edgeColorBuffer);
    // Beam resources
    if (this.beamProgram) this.gl.deleteProgram(this.beamProgram);
    if (this.beamPositionBuffer) this.gl.deleteBuffer(this.beamPositionBuffer);
    if (this.beamColorBuffer) this.gl.deleteBuffer(this.beamColorBuffer);
    if (this.beamSizeBuffer) this.gl.deleteBuffer(this.beamSizeBuffer);
  }
}
