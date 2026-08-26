export const edgeVertexShaderSource = `
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

export const edgeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  uniform float u_time;
  uniform int u_theme_mode;
  uniform float u_cognitive_charge;

  // Thinking Pulse (3D Spherical Ripple)
  uniform float u_ripple_active;
  uniform float u_ripple_time;
  uniform float u_ripple_duration;
  uniform float u_ripple_max_radius;
  uniform vec3 u_ripple_origin;
  uniform vec3 u_ripple_color;

  void main() {
    float pulseSpeed = (u_theme_mode == 3 || u_theme_mode == 4) ? 4.0 : 2.0;
    float pulse = 0.5 + 0.5 * sin(u_time * pulseSpeed + (v_world_pos.x + v_world_pos.y + v_world_pos.z) * 0.02);
    float fog = 1.0 - smoothstep(0.45, 1.0, v_depth) * 0.55;

    // Cognitive Charge scaling (0.2 at rest -> 0.9 at full charge)
    float chargeGlow = 0.2 + 0.7 * clamp(u_cognitive_charge, 0.0, 1.0);

    vec4 baseColor;
    if (u_theme_mode == 4) { // Cyber mode
      baseColor = vec4(v_color.rgb * (0.8 + 0.3 * pulse + chargeGlow * 0.5), v_color.a * (0.35 + 0.45 * pulse + chargeGlow * 0.3) * fog);
    } else {
      baseColor = vec4(v_color.rgb * (1.0 + chargeGlow * 0.4), v_color.a * (0.4 + 0.4 * pulse + chargeGlow * 0.3) * fog);
    }

    // Thinking Pulse (Spherical Shockwave on Edges)
    if (u_ripple_active > 0.5) {
      float dist3D = length(v_world_pos - u_ripple_origin);
      float progress = clamp(u_ripple_time / max(0.001, u_ripple_duration), 0.0, 1.0);
      float waveRadius = progress * u_ripple_max_radius;
      float bandWidth = 120.0 + progress * 80.0;
      float ring = exp(-pow(dist3D - waveRadius, 2.0) / (2.0 * bandWidth * bandWidth));
      float fade = 1.0 - smoothstep(0.7, 1.0, progress);
      baseColor.rgb += u_ripple_color * ring * fade * 1.2;
      baseColor.a = min(1.0, baseColor.a + ring * fade * 0.6);
    }

    gl_FragColor = baseColor;
  }
`;
