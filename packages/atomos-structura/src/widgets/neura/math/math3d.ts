// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

/**
 * High-performance 4x4 Column-Major Matrix & 3D Vector Math Utilities.
 * Pure mathematical functions designed for WebGL rendering pipelines with zero-allocation options.
 */

export type Mat4 = Float32Array;
export type Vec3 = [number, number, number];

export function mat4Create(): Mat4 {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function mat4Perspective(
  out: Mat4,
  fovy: number,
  aspect: number,
  near: number,
  far: number
): Mat4 {
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
  out[14] = 2 * far * near * nf;
  out[15] = 0;
  return out;
}

export function mat4LookAt(
  out: Mat4,
  eye: Vec3,
  center: Vec3,
  up: Vec3
): Mat4 {
  const eyex = eye[0];
  const eyey = eye[1];
  const eyez = eye[2];
  const centerx = center[0];
  const centery = center[1];
  const centerz = center[2];
  const upx = up[0];
  const upy = up[1];
  const upz = up[2];

  let z0 = eyex - centerx;
  let z1 = eyey - centery;
  let z2 = eyez - centerz;
  let len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;

  let x0 = upy * z2 - upz * z1;
  let x1 = upz * z0 - upx * z2;
  let x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);
  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  let y0 = z1 * x2 - z2 * x1;
  let y1 = z2 * x0 - z0 * x2;
  let y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);
  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

export function mat4Multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const a00 = a[0] ?? 0;
  const a01 = a[1] ?? 0;
  const a02 = a[2] ?? 0;
  const a03 = a[3] ?? 0;
  const a10 = a[4] ?? 0;
  const a11 = a[5] ?? 0;
  const a12 = a[6] ?? 0;
  const a13 = a[7] ?? 0;
  const a20 = a[8] ?? 0;
  const a21 = a[9] ?? 0;
  const a22 = a[10] ?? 0;
  const a23 = a[11] ?? 0;
  const a30 = a[12] ?? 0;
  const a31 = a[13] ?? 0;
  const a32 = a[14] ?? 0;
  const a33 = a[15] ?? 0;

  let b0 = b[0] ?? 0;
  let b1 = b[1] ?? 0;
  let b2 = b[2] ?? 0;
  let b3 = b[3] ?? 0;
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4] ?? 0;
  b1 = b[5] ?? 0;
  b2 = b[6] ?? 0;
  b3 = b[7] ?? 0;
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8] ?? 0;
  b1 = b[9] ?? 0;
  b2 = b[10] ?? 0;
  b3 = b[11] ?? 0;
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12] ?? 0;
  b1 = b[13] ?? 0;
  b2 = b[14] ?? 0;
  b3 = b[15] ?? 0;
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

export function parseHexColor(hex: string): Vec3 {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return [r, g, b];
  }
  return [1.0, 1.0, 1.0];
}
