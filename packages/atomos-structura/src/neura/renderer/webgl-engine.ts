import type { NeuraNode, NeuraEdge, NeuraViewport } from '../core/neura-store.js';

export type ShaderTheme = 'normal' | 'dark' | 'neon' | 'pulse' | 'cyber';

const nodeVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  attribute float a_size_attr;
  
  uniform vec2 u_resolution;
  uniform vec2 u_translation;
  uniform float u_zoom;

  varying vec4 v_color;

  void main() {
    // Apply pan and zoom
    vec2 position = (a_position + u_translation) * u_zoom;
    
    // Convert from pixel space to clip space (-1.0 to 1.0)
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    
    // WebGL Y is flipped
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    
    // Point size scales smoothly with zoom, min 2.5px to max 32.0px
    float baseSize = clamp(a_size_attr, 3.0, 20.0);
    gl_PointSize = clamp(baseSize * pow(u_zoom, 0.45), 2.5, 32.0);
    
    v_color = a_color;
  }
`;

const nodeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  uniform int u_theme_mode;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) {
      discard;
    }
    
    // Soft outer glow for cyber / neon / pulse
    if (u_theme_mode == 2 || u_theme_mode == 3 || u_theme_mode == 4) {
      float glow = 1.0 - smoothstep(0.25, 0.5, dist);
      gl_FragColor = vec4(v_color.rgb * (1.0 + glow * 0.4), v_color.a * glow);
    } else {
      gl_FragColor = v_color;
    }
  }
`;

const edgeVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec4 a_color;
  
  uniform vec2 u_resolution;
  uniform vec2 u_translation;
  uniform float u_zoom;

  varying vec4 v_color;
  varying vec2 v_world_pos;

  void main() {
    vec2 position = (a_position + u_translation) * u_zoom;
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    
    v_color = a_color;
    v_world_pos = a_position;
  }
`;

const edgeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying vec2 v_world_pos;
  uniform float u_time;
  uniform int u_theme_mode;
  
  void main() {
    float pulseSpeed = (u_theme_mode == 3 || u_theme_mode == 4) ? 4.0 : 2.0;
    float pulse = 0.5 + 0.5 * sin(u_time * pulseSpeed + (v_world_pos.x + v_world_pos.y) * 0.02);
    
    if (u_theme_mode == 4) { // Cyber mode
      gl_FragColor = vec4(v_color.rgb * (0.8 + 0.3 * pulse), v_color.a * (0.35 + 0.45 * pulse));
    } else {
      gl_FragColor = vec4(v_color.rgb, v_color.a * (0.4 + 0.4 * pulse));
    }
  }
`;

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

export class WebGLEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  
  private nodeProgram: WebGLProgram | null = null;
  private nodePositionBuffer: WebGLBuffer | null = null;
  private nodeColorBuffer: WebGLBuffer | null = null;
  private nodeSizeBuffer: WebGLBuffer | null = null;
  
  private edgeProgram: WebGLProgram | null = null;
  private edgePositionBuffer: WebGLBuffer | null = null;
  private edgeColorBuffer: WebGLBuffer | null = null;
  
  private animationFrameId: number | null = null;
  private theme: ShaderTheme = 'normal';

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

    this.nodeProgram = this.createProgram(nodeVertexShaderSource, nodeFragmentShaderSource);
    if (!this.nodeProgram) throw new Error('Failed to create node program');

    this.edgeProgram = this.createProgram(edgeVertexShaderSource, edgeFragmentShaderSource);
    if (!this.edgeProgram) throw new Error('Failed to create edge program');

    this.nodePositionBuffer = this.gl.createBuffer();
    this.nodeColorBuffer = this.gl.createBuffer();
    this.nodeSizeBuffer = this.gl.createBuffer();
    this.edgePositionBuffer = this.gl.createBuffer();
    this.edgeColorBuffer = this.gl.createBuffer();
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

  public render(
    nodes: NeuraNode[],
    edges: NeuraEdge[],
    viewport: NeuraViewport,
    activeNodeIds: Set<string>,
    activeEdgeIds: Set<string>,
    hasActiveFocus: boolean
  ) {
    if (!this.nodeProgram || !this.edgeProgram) return;

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    const modeId = THEME_MODE_ID[this.theme] ?? 0;

    // --- RENDER EDGES ---
    this.gl.useProgram(this.edgeProgram);

    const eRes = this.gl.getUniformLocation(this.edgeProgram, 'u_resolution');
    const eTrans = this.gl.getUniformLocation(this.edgeProgram, 'u_translation');
    const eZoom = this.gl.getUniformLocation(this.edgeProgram, 'u_zoom');
    const eTime = this.gl.getUniformLocation(this.edgeProgram, 'u_time');
    const eTheme = this.gl.getUniformLocation(this.edgeProgram, 'u_theme_mode');

    this.gl.uniform2f(eRes, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(eTrans, viewport.x, viewport.y);
    this.gl.uniform1f(eZoom, viewport.zoom);
    this.gl.uniform1f(eTime, performance.now() / 1000.0);
    this.gl.uniform1i(eTheme, modeId);

    const edgePositions = new Float32Array(edges.length * 4);
    const edgeColors = new Float32Array(edges.length * 8);

    const nodeLookup = new Map<string, NeuraNode>();
    for (const node of nodes) {
      nodeLookup.set(node.id, node);
    }

    let edgeCount = 0;
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i]!;
      const source = nodeLookup.get(edge.sourceId);
      const target = nodeLookup.get(edge.targetId);
      if (source && target) {
        edgePositions[edgeCount * 4] = source.x;
        edgePositions[edgeCount * 4 + 1] = source.y;
        edgePositions[edgeCount * 4 + 2] = target.x;
        edgePositions[edgeCount * 4 + 3] = target.y;

        let r = 0.2, g = 0.45, b = 0.8, a = 0.25;
        if (this.theme === 'cyber') {
          r = 0.0; g = 0.75; b = 1.0; a = 0.25;
        } else if (this.theme === 'neon') {
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
    this.gl.vertexAttribPointer(ePosAttr, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.edgeColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, edgeColors, this.gl.DYNAMIC_DRAW);
    const eColorAttr = this.gl.getAttribLocation(this.edgeProgram, 'a_color');
    this.gl.enableVertexAttribArray(eColorAttr);
    this.gl.vertexAttribPointer(eColorAttr, 4, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.LINES, 0, edgeCount * 2);

    // --- RENDER NODES ---
    this.gl.useProgram(this.nodeProgram);

    const uResolution = this.gl.getUniformLocation(this.nodeProgram, 'u_resolution');
    const uTranslation = this.gl.getUniformLocation(this.nodeProgram, 'u_translation');
    const uZoom = this.gl.getUniformLocation(this.nodeProgram, 'u_zoom');
    const uTheme = this.gl.getUniformLocation(this.nodeProgram, 'u_theme_mode');

    this.gl.uniform2f(uResolution, this.canvas.width, this.canvas.height);
    this.gl.uniform2f(uTranslation, viewport.x, viewport.y);
    this.gl.uniform1f(uZoom, viewport.zoom);
    this.gl.uniform1i(uTheme, modeId);

    const positions = new Float32Array(nodes.length * 2);
    const colors = new Float32Array(nodes.length * 4);
    const sizes = new Float32Array(nodes.length);

    const getColor = (id: string): [number, number, number] => {
      const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      if (this.theme === 'cyber') {
        const palettes = [
          [0.0, 0.94, 1.0], // cyan
          [0.0, 0.47, 1.0], // cobalt
          [0.55, 0.36, 0.96], // indigo
          [0.06, 0.72, 0.51], // emerald
        ];
        return palettes[Math.abs(hash) % palettes.length] as [number, number, number];
      }
      if (this.theme === 'neon') {
        const palettes = [
          [0.22, 1.0, 0.08], // neon green
          [1.0, 0.03, 0.23], // neon pink
          [0.0, 0.9, 1.0],   // electric blue
          [0.74, 0.07, 1.0], // neon purple
        ];
        return palettes[Math.abs(hash) % palettes.length] as [number, number, number];
      }
      const r = ((hash >> 16) & 0xFF) / 255;
      const g = ((hash >> 8) & 0xFF) / 255;
      const b = (hash & 0xFF) / 255;
      return [r, g, b];
    };

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      positions[i * 2] = node.x;
      positions[i * 2 + 1] = node.y;

      let r = 0.0, g = 0.47, b = 1.0;
      if (node.metadata?.color && typeof node.metadata.color === 'string' && node.metadata.color.startsWith('#')) {
        const hex = node.metadata.color.replace('#', '');
        if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16) / 255;
          g = parseInt(hex.substring(2, 4), 16) / 255;
          b = parseInt(hex.substring(4, 6), 16) / 255;
        } else {
          [r, g, b] = getColor(node.appartenanceId);
        }
      } else {
        [r, g, b] = getColor(node.appartenanceId);
      }

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

      colors[i * 4] = Math.min(1.0, r * brightness);
      colors[i * 4 + 1] = Math.min(1.0, g * brightness);
      colors[i * 4 + 2] = Math.min(1.0, b * brightness);
      colors[i * 4 + 3] = opacity;

      sizes[i] = node.weight;
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodePositionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.DYNAMIC_DRAW);
    const aPosition = this.gl.getAttribLocation(this.nodeProgram, 'a_position');
    this.gl.enableVertexAttribArray(aPosition);
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodeColorBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, colors, this.gl.DYNAMIC_DRAW);
    const aColor = this.gl.getAttribLocation(this.nodeProgram, 'a_color');
    this.gl.enableVertexAttribArray(aColor);
    this.gl.vertexAttribPointer(aColor, 4, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.nodeSizeBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, sizes, this.gl.DYNAMIC_DRAW);
    const aSizeAttr = this.gl.getAttribLocation(this.nodeProgram, 'a_size_attr');
    this.gl.enableVertexAttribArray(aSizeAttr);
    this.gl.vertexAttribPointer(aSizeAttr, 1, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.POINTS, 0, nodes.length);
  }

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
    if (this.nodeProgram) this.gl.deleteProgram(this.nodeProgram);
    if (this.edgeProgram) this.gl.deleteProgram(this.edgeProgram);
    if (this.nodePositionBuffer) this.gl.deleteBuffer(this.nodePositionBuffer);
    if (this.nodeColorBuffer) this.gl.deleteBuffer(this.nodeColorBuffer);
    if (this.nodeSizeBuffer) this.gl.deleteBuffer(this.nodeSizeBuffer);
    if (this.edgePositionBuffer) this.gl.deleteBuffer(this.edgePositionBuffer);
    if (this.edgeColorBuffer) this.gl.deleteBuffer(this.edgeColorBuffer);
  }
}
