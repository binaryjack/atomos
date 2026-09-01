export const edgeVertexShaderSource = `
  precision mediump float;
  attribute vec3 a_position;
  attribute vec4 a_color;
  attribute float a_morphology; // 0=wire, 1=myelinated_tube, 2=synaptic_lightning, 3=quantum_flow, 4=catenary
  attribute float a_t;          // 0.0 at source -> 1.0 at target

  uniform mat4 u_mvp_matrix;
  uniform float u_time;
  uniform float u_brain_wave_freq;
  uniform float u_brain_wave_amp;

  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  varying float v_morphology;
  varying float v_t;

  void main() {
    vec3 pos = a_position;

    // 1. Procedural Fractal Lightning Jitter (if morphology == 2)
    if (a_morphology >= 1.5 && a_morphology < 2.5) {
      float envelope = sin(a_t * 3.14159); // 0 at ends, max in middle
      float noiseX = sin(a_t * 28.0 + u_time * 30.0) * cos(a_t * 14.0 - u_time * 20.0);
      float noiseY = cos(a_t * 32.0 - u_time * 25.0) * sin(a_t * 19.0 + u_time * 15.0);
      float noiseZ = sin(a_t * 22.0 + u_time * 18.0);
      pos += vec3(noiseX, noiseY, noiseZ) * (envelope * 12.0);
    }
    // 2. Catenary / Magnetic Curve Sag (if morphology == 4)
    else if (a_morphology >= 3.5) {
      float sag = sin(a_t * 3.14159) * -18.0;
      pos.y += sag;
    }

    // 3. Brain wave oscillation
    float wavePhase = u_time * (u_brain_wave_freq * 0.1) + (pos.x + pos.y + pos.z) * 0.005;
    pos.y += sin(wavePhase) * u_brain_wave_amp * 1.5;

    vec4 clipPos = u_mvp_matrix * vec4(pos, 1.0);
    gl_Position = clipPos;

    v_color = a_color;
    v_world_pos = pos;
    v_depth = clamp((clipPos.z / max(0.1, clipPos.w)) * 0.5 + 0.5, 0.0, 1.0);
    v_morphology = a_morphology;
    v_t = a_t;
  }
`;

export const edgeFragmentShaderSource = `
  precision mediump float;
  varying vec4 v_color;
  varying vec3 v_world_pos;
  varying float v_depth;
  varying float v_morphology;
  varying float v_t;

  uniform float u_time;
  uniform int u_theme_mode;
  uniform float u_cognitive_charge;
  uniform int u_emotion_mode;
  uniform vec3 u_emotion_color;

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

    vec4 baseColor = vec4(v_color.rgb * (1.0 + chargeGlow * 0.4), v_color.a * (0.4 + 0.4 * pulse + chargeGlow * 0.3) * fog);

    // 1. Myelinated Axon Tube: periodic myelin sheaths & Ranvier constrictions
    if (v_morphology >= 0.5 && v_morphology < 1.5) {
      float sheath = 0.5 + 0.5 * sin(v_t * 30.0);
      baseColor.rgb *= (0.8 + 0.5 * sheath);
      baseColor.a *= (0.7 + 0.3 * sheath);
    }
    // 2. Synaptic Lightning Arc: intense flickering plasma glow
    else if (v_morphology >= 1.5 && v_morphology < 2.5) {
      float flicker = 0.7 + 0.3 * sin(u_time * 50.0 + v_t * 20.0);
      baseColor.rgb = mix(baseColor.rgb, vec3(0.4, 0.9, 1.0) * (2.0 + flicker), 0.85);
      baseColor.a = min(1.0, baseColor.a * 1.8 * flicker);
    }
    // 3. Quantum Flow: travelling vesicle pulses sliding along the axon
    else if (v_morphology >= 2.5 && v_morphology < 3.5) {
      float vesiclePhase = fract(v_t * 5.0 - u_time * 3.0);
      float vesicleGlow = smoothstep(0.85, 1.0, vesiclePhase) + smoothstep(0.15, 0.0, vesiclePhase);
      baseColor.rgb += vec3(0.0, 0.8, 1.0) * vesicleGlow * 1.8;
      baseColor.a = max(baseColor.a, vesicleGlow * 0.9);
    }

    // Thinking Pulse (Spherical Shockwave on Edges)
    if (u_ripple_active > 0.5) {
      float dist3D = length(v_world_pos - u_ripple_origin);
      float progress = clamp(u_ripple_time / max(0.001, u_ripple_duration), 0.0, 1.0);
      float waveRadius = progress * u_ripple_max_radius;
      float bandWidth = 120.0 + progress * 80.0;
      float ring = exp(-pow(dist3D - waveRadius, 2.0) / (2.0 * bandWidth * bandWidth));
      float fade = 1.0 - smoothstep(0.7, 1.0, progress);
      baseColor.rgb += u_ripple_color * ring * fade * 1.4;
      baseColor.a = min(1.0, baseColor.a + ring * fade * 0.6);
    }

    gl_FragColor = baseColor;
  }
`;
