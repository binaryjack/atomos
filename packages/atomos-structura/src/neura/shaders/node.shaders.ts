/** Node vertex shader with organic breathing, turgor swelling, Simplex jitter, and cognitive emotion modulation */
export const nodeVertexShaderSource = `
  precision mediump float;
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_size_attr;
  attribute float a_activity;
  attribute vec3 a_halo_color;
  attribute float a_morphology; // 0=soma_spherical, 1=soma_dendritic, 2=quantum_crystal, 3=vesicle, 4=ring_oracle
  attribute float a_turgor_scale;

  uniform mat4 u_mvp_matrix;
  uniform float u_viewport_height;
  uniform float u_time;
  uniform float u_cognitive_charge;
  uniform int u_emotion_mode; // 0=harmonic, 1=curiosity, 2=conflict, 3=insight, 4=high_load, 5=dreaming
  uniform float u_brain_wave_freq;
  uniform float u_brain_wave_amp;

  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  varying float v_activity;
  varying vec3 v_halo_color;
  varying float v_morphology;
  varying float v_turgor;

  void main() {
    // 1. Brain wave harmonic displacement
    float wavePhase = u_time * (u_brain_wave_freq * 0.1) + (a_position.x + a_position.y + a_position.z) * 0.005;
    float waveDisplacement = sin(wavePhase) * u_brain_wave_amp * 2.0;

    // 2. Conflict micro-jitter (high-frequency neural hesitation)
    vec3 jitter = vec3(0.0);
    if (u_emotion_mode == 2) {
      float jTime = u_time * 45.0 + a_position.x * 12.0;
      jitter = vec3(sin(jTime), cos(jTime * 1.3), sin(jTime * 0.7)) * 1.5;
    }

    vec3 displacedPos = a_position + vec3(0.0, waveDisplacement, 0.0) + jitter;
    vec4 clipPos = u_mvp_matrix * vec4(displacedPos, 1.0);
    gl_Position = clipPos;

    // 3. Living Cellular Turgor Swelling (+50% to +80% dilation on action potential)
    float turgor = max(1.0, a_turgor_scale);
    float chargeScale = 1.0 + u_cognitive_charge * 0.45;

    // 4. Organic Simplex Breathing (slow 0.3 Hz rhythm at rest)
    float breathFreq = (u_emotion_mode == 5) ? 0.8 : (u_emotion_mode == 4 ? 6.0 : 2.0);
    float organicBreath = 1.0 + 0.12 * sin(u_time * breathFreq + (a_position.x + a_position.y) * 0.02);

    float pulseScale = (1.0 + a_activity * (0.25 + 0.35 * (0.5 + 0.5 * sin(u_time * 5.0)))) * chargeScale * turgor * organicBreath;
    float baseSize = clamp(a_size_attr, 4.0, 26.0) * pulseScale;
    float pointScale = (baseSize * u_viewport_height * 0.75) / max(0.1, clipPos.w);
    gl_PointSize = clamp(pointScale, 3.0, 68.0);

    v_color = a_color;
    v_world_pos = displacedPos;
    v_depth = clamp((clipPos.z / max(0.1, clipPos.w)) * 0.5 + 0.5, 0.0, 1.0);
    v_activity = a_activity;
    v_halo_color = a_halo_color;
    v_morphology = a_morphology;
    v_turgor = turgor;
  }
`;

/** Node fragment shader with multi-morphology SDF rendering, dendritic tentacles, Fresnel nucleus & emotion aura */
export const nodeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  varying float v_activity;
  varying vec3 v_halo_color;
  varying float v_morphology;
  varying float v_turgor;

  uniform int u_theme_mode;
  uniform float u_time;
  uniform float u_cognitive_charge;
  uniform int u_emotion_mode;
  uniform vec3 u_emotion_color;
  uniform float u_emotion_intensity;

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
    float angle = atan(coord.y, coord.x);

    // Dynamic morphology distance thresholding
    float maxRadius = 0.5;

    // Morphology 1: Soma Dendritic (Polar tentacle star harmonics)
    if (v_morphology > 0.5 && v_morphology < 1.5) {
      float tentacles = sin(angle * 6.0 + u_time * 2.0) * 0.12 + cos(angle * 3.0 - u_time) * 0.06;
      maxRadius += tentacles;
    }
    // Morphology 2: Quantum Crystal (Manhattan/Octahedral diamond boundary)
    else if (v_morphology >= 1.5 && v_morphology < 2.5) {
      float diamondDist = (abs(coord.x) + abs(coord.y)) * 0.75;
      dist = diamondDist;
    }
    // Morphology 4: Ring Oracle (Concentric holographic rings)
    else if (v_morphology >= 3.5) {
      float ringCut = abs(dist - 0.35);
      if (ringCut > 0.12 && dist > 0.18) {
        discard;
      }
    }

    if (dist > maxRadius) {
      discard;
    }

    // Cosmic Fog: gently fade distant nodes in depth
    float fog = 1.0 - smoothstep(0.45, 1.0, v_depth) * 0.5;

    // Cognitive Charge scales bloom / emissive baseline (0.2 at rest -> 0.9 at full charge)
    float chargeGlow = 0.2 + 0.7 * clamp(u_cognitive_charge, 0.0, 1.0);

    // 3D Volumetric Fresnel Rim Lighting (glowing cellular membrane + inner nucleus)
    float fresnel = pow(dist / maxRadius, 2.2);
    float nucleus = smoothstep(0.18, 0.0, dist);

    // Base color with theme glow & charge scaling
    vec4 baseColor;
    if (u_theme_mode == 2 || u_theme_mode == 3 || u_theme_mode == 4) {
      float glow = 1.0 - smoothstep(0.2, maxRadius, dist);
      baseColor = vec4(
        v_color.rgb * (1.0 + glow * (0.4 + chargeGlow * 0.8) + fresnel * 0.7 + nucleus * 0.9),
        v_color.a * glow * fog * (0.7 + chargeGlow * 0.3)
      );
    } else {
      baseColor = vec4(v_color.rgb * (0.8 + chargeGlow * 0.4 + nucleus * 0.5), v_color.a * fog);
    }

    // Non-Verbal Cognitive Emotion Aura Blending
    if (u_emotion_intensity > 0.05) {
      float auraGlow = smoothstep(maxRadius, 0.0, dist) * u_emotion_intensity * 0.65;
      baseColor.rgb = mix(baseColor.rgb, u_emotion_color * (1.2 + chargeGlow), auraGlow);
    }

    // Thinking Pulse (3D Spherical Shockwave)
    if (u_ripple_active > 0.5) {
      float dist3D = length(v_world_pos - u_ripple_origin);
      float progress = clamp(u_ripple_time / max(0.001, u_ripple_duration), 0.0, 1.0);
      float waveRadius = progress * u_ripple_max_radius;
      float bandWidth = 120.0 + progress * 80.0;
      float ring = exp(-pow(dist3D - waveRadius, 2.0) / (2.0 * bandWidth * bandWidth));
      float fade = 1.0 - smoothstep(0.7, 1.0, progress);
      vec3 rippleGlow = u_ripple_color * ring * fade * 1.6;
      baseColor.rgb += rippleGlow;
      baseColor.a = min(1.0, baseColor.a + ring * fade * 0.5);
    }

    // Coronal Halo: bright inner core + pulsating outer corona ring
    if (v_activity > 0.05) {
      float haloIntensity = v_activity;

      // Inner core brightening
      float innerGlow = smoothstep(0.35, 0.0, dist) * haloIntensity;

      // Corona ring — bright band between inner core and outer edge
      float coronaRing = smoothstep(maxRadius, maxRadius * 0.6, dist) * smoothstep(0.15, maxRadius * 0.6, dist) * haloIntensity;
      float pulse = 0.7 + 0.3 * sin(u_time * 6.0);

      vec3 coronaColor = v_halo_color * pulse;

      baseColor.rgb += coronaColor * coronaRing * 0.8;
      baseColor.rgb += vec3(1.0) * innerGlow * 0.4;
      baseColor.a = max(baseColor.a, haloIntensity * 0.95);
    }

    gl_FragColor = baseColor;
  }
`;
