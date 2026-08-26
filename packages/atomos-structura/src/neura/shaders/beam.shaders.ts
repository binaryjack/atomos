/** Beam particle vertex shader — renders glowing energy orbs traveling along edges */
export const beamVertexShaderSource = `
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
export const beamFragmentShaderSource = `
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

    gl_FragColor = vec4(v_color.rgb * (1.2 + glow * 0.8), v_color.a * glow);
  }
`;
