/** Node vertex shader with activity-driven pulsation and cognitive charge scaling */
export const nodeVertexShaderSource = `
  precision mediump float;
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_size_attr;
  attribute float a_activity;
  attribute vec3 a_halo_color;

  uniform mat4 u_mvp_matrix;
  uniform float u_viewport_height;
  uniform float u_time;
  uniform float u_cognitive_charge;

  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  varying float v_activity;
  varying vec3 v_halo_color;

  void main() {
    vec4 clipPos = u_mvp_matrix * vec4(a_position, 1.0);
    gl_Position = clipPos;

    // Cognitive charge scales node point size dynamically (0.2 rest -> 0.9 full charge)
    float chargeScale = 1.0 + u_cognitive_charge * 0.45;
    float pulseScale = (1.0 + a_activity * (0.2 + 0.3 * (0.5 + 0.5 * sin(u_time * 4.0)))) * chargeScale;
    float baseSize = clamp(a_size_attr, 3.0, 20.0) * pulseScale;
    float pointScale = (baseSize * u_viewport_height * 0.75) / max(0.1, clipPos.w);
    gl_PointSize = clamp(pointScale, 2.5, 54.0);

    v_color = a_color;
    v_world_pos = a_position;
    v_depth = clamp((clipPos.z / max(0.1, clipPos.w)) * 0.5 + 0.5, 0.0, 1.0);
    v_activity = a_activity;
    v_halo_color = a_halo_color;
  }
`;

/** Node fragment shader with coronal halo and 3D spherical ripple shockwave */
export const nodeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  varying float v_activity;
  varying vec3 v_halo_color;
  uniform int u_theme_mode;
  uniform float u_time;
  uniform float u_cognitive_charge;

  // Thinking Pulse (3D Spherical Ripple)
  uniform float u_ripple_active;
  uniform float u_ripple_time;
  uniform float u_ripple_duration;
  uniform float u_ripple_max_radius;
  uniform vec3 u_ripple_origin;
  uniform vec3 u_ripple_color;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) {
      discard;
    }

    // Cosmic Fog: gently fade distant nodes in depth
    float fog = 1.0 - smoothstep(0.45, 1.0, v_depth) * 0.5;

    // Cognitive Charge scales bloom / emissive baseline (0.2 at rest -> 0.9 at full charge)
    float chargeGlow = 0.2 + 0.7 * clamp(u_cognitive_charge, 0.0, 1.0);

    // Base color with theme glow & charge scaling
    vec4 baseColor;
    if (u_theme_mode == 2 || u_theme_mode == 3 || u_theme_mode == 4) {
      float glow = 1.0 - smoothstep(0.25, 0.5, dist);
      baseColor = vec4(v_color.rgb * (1.0 + glow * (0.4 + chargeGlow * 0.8)), v_color.a * glow * fog * (0.7 + chargeGlow * 0.3));
    } else {
      baseColor = vec4(v_color.rgb * (0.8 + chargeGlow * 0.4), v_color.a * fog);
    }

    // Thinking Pulse (3D Spherical Shockwave)
    if (u_ripple_active > 0.5) {
      float dist3D = length(v_world_pos - u_ripple_origin);
      float progress = clamp(u_ripple_time / max(0.001, u_ripple_duration), 0.0, 1.0);
      float waveRadius = progress * u_ripple_max_radius;
      float bandWidth = 120.0 + progress * 80.0;
      float ring = exp(-pow(dist3D - waveRadius, 2.0) / (2.0 * bandWidth * bandWidth));
      float fade = 1.0 - smoothstep(0.7, 1.0, progress);
      vec3 rippleGlow = u_ripple_color * ring * fade * 1.5;
      baseColor.rgb += rippleGlow;
      baseColor.a = min(1.0, baseColor.a + ring * fade * 0.5);
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
