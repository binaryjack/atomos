// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

export type ShaderTheme = 'normal' | 'dark' | 'neon' | 'pulse' | 'cyber';

export const THEME_MODE_ID: Record<ShaderTheme, number> = {
  normal: 0,
  dark: 1,
  neon: 2,
  pulse: 3,
  cyber: 4,
};

export const THEME_BG: Record<ShaderTheme, [number, number, number, number]> = {
  normal: [0.04, 0.05, 0.08, 1.0],
  dark: [0.02, 0.02, 0.04, 1.0],
  neon: [0.01, 0.01, 0.02, 1.0],
  pulse: [0.03, 0.02, 0.06, 1.0],
  cyber: [0.01, 0.03, 0.06, 1.0],
};

/**
 * Initializes and configures the WebGL context with standard blending and depth test.
 */
export function initWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const gl = canvas.getContext('webgl2', { antialias: true }) || canvas.getContext('webgl', { antialias: true });
  if (!gl) {
    throw new Error('WebGL is not supported by your browser.');
  }

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  return gl;
}

/**
 * Updates the clear color based on the selected shader theme.
 */
export function applyThemeClearColor(gl: WebGLRenderingContext, theme: ShaderTheme): void {
  const bg = THEME_BG[theme] ?? THEME_BG.normal;
  gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
}

/**
 * Restores the default alpha-blending and depth-write configuration.
 */
export function restoreStandardBlending(gl: WebGLRenderingContext): void {
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(true);
}
