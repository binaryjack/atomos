// Copyright (c) Tadeop. All rights reserved.
// Proprietary and Confidential Source Code.

import { createNeuraStore } from './core/neura-store.js';
import type {
  NeuraEdge,
  NeuraNode,
  NodeActivityState,
  NodeMorphology,
  EdgeMorphology,
  CognitiveEmotion,
  BrainWaveType,
} from './core/neura-store.js';
import { CullingSystem } from './renderer/culling-system.js';
import { type ShaderTheme, WebGLEngine } from './renderer/webgl-engine.js';
import type { PhysicsParams } from './physics/worker.js';
import { createNeuraPhysicsWorker } from './physics/worker-script.js';
import { pruneCompletedBeams } from './core/neura-telemetry.js';
import type { NeuraConfig } from './core/neura-config.js';
import { createNeuraLabelsController } from './renderer/neura-labels.js';
import { generateMockGraph } from './data/mock-graph-generator.js';
import { CameraController } from './controllers/camera-controller.js';
import { InteractionController } from './controllers/interaction-controller.js';
import { TelemetryController } from './controllers/telemetry-controller.js';

export interface NeuraInstanceOptions {
  worker?: Worker | string | URL | undefined;
  theme?: ShaderTheme | undefined;
  physicsParams?: Partial<PhysicsParams> | undefined;
  labelsMode?: ('focus-only' | 'auto' | 'always') | undefined;
  config?: Partial<NeuraConfig> | undefined;
  onNodeClick?: ((node: NeuraNode | null) => void) | undefined;
  onNodeHover?: ((node: NeuraNode | null) => void) | undefined;
  onFPS?: ((fps: number) => void) | undefined;
}

export interface NeuraInstance {
  store: ReturnType<typeof createNeuraStore>['store'];
  webgl: WebGLEngine;
  worker: Worker;
  loadGraph: (nodes: NeuraNode[], edges: NeuraEdge[]) => void;
  generateMockData: (numNodes: number) => void;
  flyToNode: (nodeId: string, targetZoom?: number, durationMs?: number) => void;
  setCameraRotation: (yaw: number, pitch: number) => void;
  setAutoRotate: (enabled: boolean, speed?: number) => void;
  resetCamera: () => void;
  setPhysicsParams: (params: Partial<PhysicsParams>) => void;
  setShaderTheme: (theme: ShaderTheme) => void;
  setLabelsMode: (mode: 'focus-only' | 'auto' | 'always') => void;
  reheatPhysics: (alpha?: number) => void;
  getFPS: () => number;
  destroy: () => void;

  // Telemetry API
  setNodeActivity: (nodeId: string, activity: number, state?: NodeActivityState) => void;
  triggerEnergyBeam: (sourceId: string, targetId: string, color?: string, durationMs?: number) => void;
  pulseNode: (nodeId: string, durationMs?: number, color?: string) => void;
  resetAllActivities: () => void;
  highlightRoute: (sourceId: string, targetId: string, keepActive?: boolean) => void;

  // Morphologies & Living Emotion API
  setNodeMorphology: (nodeId: string, morphology: NodeMorphology) => void;
  setEdgeMorphology: (edgeId: string, morphology: EdgeMorphology) => void;
  setCognitiveEmotion: (emotion: CognitiveEmotion, intensity?: number) => void;
  triggerTurgorPulse: (nodeId: string, peakDilation?: number, durationMs?: number, attackMs?: number) => void;
  triggerSynapticLightning: (sourceId: string, targetId: string, color?: string, durationMs?: number) => void;
  setBrainWaveOscillation: (waveType: BrainWaveType, freq?: number, amp?: number) => void;

  // Empathic Listening & Synaptic Charge API
  setCognitiveCharge: (charge: number) => void;
  fireThinkingPulse: (
    colorOrOrigin?: string | [number, number, number],
    durationOrColor?: number | string,
    color?: string
  ) => void;
  releaseCognitiveCharge: (activeSlotId: number) => void;
}

/**
 * Creates and initializes a complete Neura 3D instance, wiring together
 * state management, WebGL rendering, physics workers, camera, interactions, and telemetry.
 */
export function createNeuraInstance(
  canvas: HTMLCanvasElement,
  options: NeuraInstanceOptions | string | URL = {}
): NeuraInstance {
  const opts: NeuraInstanceOptions =
    typeof options === 'string' || options instanceof URL
      ? { worker: options }
      : options;

  const {
    store,
    setViewport,
    setNodeActivity,
    setNodeMorphology,
    setEdgeMorphology,
    setCognitiveEmotion,
    setBrainWaveOscillation,
    triggerTurgorPulse,
    triggerSynapticLightning,
    addEnergyBeam,
    setCognitiveChargeStore,
    setThinkingPulseStore,
    resetAllActivities,
  } = createNeuraStore();

  const webgl = new WebGLEngine(canvas);
  if (opts.theme) webgl.setTheme(opts.theme);

  const culling = new CullingSystem(600);

  // Initialize Physics Worker
  let worker: Worker;
  if (typeof Worker !== 'undefined' && opts.worker instanceof Worker) {
    worker = opts.worker;
  } else if (
    typeof Worker !== 'undefined' &&
    (typeof opts.worker === 'string' || opts.worker instanceof URL)
  ) {
    try {
      worker = new Worker(opts.worker, { type: 'module' });
    } catch {
      worker = createNeuraPhysicsWorker();
    }
  } else if (typeof Worker !== 'undefined') {
    worker = createNeuraPhysicsWorker();
  } else {
    // Stub Worker for test/headless environments
    worker = {
      postMessage: () => {},
      onmessage: null,
      terminate: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as unknown as Worker;
  }

  if (opts.physicsParams) {
    worker.postMessage({ type: 'SET_PARAMS', payload: opts.physicsParams });
  }

  worker.onmessage = (e: MessageEvent) => {
    if (e.data.type === 'TICK_RESULT') {
      const positions = e.data.payload as Array<{ id: string; x: number; y: number; z?: number }>;
      const state = store.value;
      const nextNodes = { ...state.nodes };
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        if (nextNodes[pos.id]) {
          nextNodes[pos.id] = {
            ...nextNodes[pos.id]!,
            x: pos.x,
            y: pos.y,
            z: pos.z ?? nextNodes[pos.id]!.z ?? 0,
          };
        }
      }
      store.set({ ...state, nodes: nextNodes });
    }
  };

  // Setup HTML Overlay container
  const parent = canvas.parentElement;
  if (parent && getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.pointerEvents = 'none';
  overlay.style.overflow = 'hidden';
  if (parent) parent.appendChild(overlay);

  let currentLabelsMode: 'focus-only' | 'auto' | 'always' = opts.labelsMode ?? 'auto';
  const labelsController = createNeuraLabelsController(canvas, overlay, webgl);

  const setLabelsMode = (mode: 'focus-only' | 'auto' | 'always') => {
    currentLabelsMode = mode;
  };

  // Controllers
  const camera = new CameraController({
    canvas,
    getViewport: () => store.value.viewport,
    setViewport,
    getNode: (id) => store.value.nodes[id],
    onFlyComplete: (nodeId) => {
      store.set({ ...store.value, selectedNodeId: nodeId });
    },
  });

  const interaction = new InteractionController({
    canvas,
    webgl,
    getViewport: () => store.value.viewport,
    setViewport,
    getNodes: () => store.value.nodes,
    getHoveredNodeId: () => store.value.hoveredNodeId,
    getSelectedNodeId: () => store.value.selectedNodeId,
    setHoveredNodeId: (id) => {
      store.set({ ...store.value, hoveredNodeId: id });
    },
    setSelectedNodeId: (id) => {
      store.set({ ...store.value, selectedNodeId: id });
    },
    onNodeClick: opts.onNodeClick,
    onNodeHover: opts.onNodeHover,
  });

  const telemetry = new TelemetryController({
    getNodes: () => store.value.nodes,
    getEdges: () => store.value.edges,
    getCognitiveCharge: () => store.value.cognitiveCharge,
    setNodeActivity,
    setNodeMorphology,
    setEdgeMorphology,
    setCognitiveEmotion,
    setBrainWaveOscillation,
    triggerTurgorPulse,
    triggerSynapticLightning,
    addEnergyBeam,
    setCognitiveChargeStore,
    setThinkingPulseStore,
    resetAllActivities,
  });

  // Resize Observer
  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || canvas.clientWidth;
        const h = entry.contentRect.height || canvas.clientHeight;
        if (w > 0 && h > 0) {
          webgl.resize(w, h);
          setViewport({ width: w, height: h });
        }
      }
    });
    resizeObserver.observe(canvas.parentElement || canvas);
  }

  // FPS tracking
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let currentFPS = 60;

  // Graph loading
  const loadGraph = (nodes: NeuraNode[], edges: NeuraEdge[]) => {
    const state = store.value;
    const nodeMap: Record<string, NeuraNode> = {};
    const edgeMap: Record<string, NeuraEdge> = {};
    for (const n of nodes) nodeMap[n.id] = n;
    for (const e of edges) edgeMap[e.id] = e;

    const canvasW = canvas.width || 1200;
    const canvasH = canvas.height || 800;
    const initialZoom = nodes.length > 400 ? 0.35 : nodes.length > 100 ? 0.5 : 0.75;

    store.set({
      ...state,
      nodes: nodeMap,
      edges: edgeMap,
      hoveredNodeId: null,
      selectedNodeId: null,
      energyBeams: [],
      cognitiveCharge: 0.0,
      thinkingPulse: null,
      viewport: {
        ...state.viewport,
        x: 0,
        y: 0,
        zoom: initialZoom,
        yaw: 0,
        pitch: 0.15,
        width: canvasW,
        height: canvasH,
      },
    });

    worker.postMessage({ type: 'STOP' });
    worker.postMessage({ type: 'INIT_DATA', payload: { nodes, edges } });
    worker.postMessage({ type: 'START' });
  };

  const generateMockData = (numNodes: number) => {
    const { nodes, edges } = generateMockGraph(numNodes);
    loadGraph(nodes, edges);
  };

  // Main Render Loop
  webgl.startLoop(() => {
    const state = store.value;

    camera.updateAutoRotate(interaction.isDragging);

    // Track FPS
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
      currentFPS = Math.round((frameCount * 1000) / (now - lastFrameTime));
      frameCount = 0;
      lastFrameTime = now;
      if (opts.onFPS) opts.onFPS(currentFPS);
    }

    // Prune completed energy beams
    const liveBeams = pruneCompletedBeams(state.energyBeams, now);
    if (liveBeams.length !== state.energyBeams.length) {
      store.set({ ...store.value, energyBeams: liveBeams });
    }

    // Prune expired thinking pulse
    let currentPulse = state.thinkingPulse;
    if (currentPulse && currentPulse.active) {
      const elapsed = now - currentPulse.startTime;
      if (elapsed > currentPulse.durationMs) {
        currentPulse = null;
        setThinkingPulseStore(null);
      }
    }

    // Spatial culling
    const { visibleNodes, visibleEdges } = culling.cull(state.nodes, state.edges, state.viewport);

    // Active Focus tracking
    const activeNodeIds = new Set<string>();
    const activeEdgeIds = new Set<string>();
    const focusId = state.hoveredNodeId || state.selectedNodeId;

    if (focusId) {
      activeNodeIds.add(focusId);
      for (const edgeKey in state.edges) {
        const edge = state.edges[edgeKey]!;
        if (edge.sourceId === focusId || edge.targetId === focusId) {
          activeEdgeIds.add(edge.id);
          activeNodeIds.add(edge.sourceId);
          activeNodeIds.add(edge.targetId);
        }
      }
    }

    // Render WebGL frame
    webgl.render(
      visibleNodes,
      visibleEdges,
      state.viewport,
      activeNodeIds,
      activeEdgeIds,
      Boolean(focusId),
      liveBeams,
      state.cognitiveCharge,
      currentPulse,
      state.cognitiveEmotion,
      state.emotionIntensity,
      state.brainWaveFreq,
      state.brainWaveAmp,
      state.synapticLightnings,
      state.turgorPulses
    );

    // Render HTML overlay labels
    labelsController.renderOverlayLabels(
      visibleNodes,
      state,
      focusId,
      currentLabelsMode,
      activeNodeIds
    );
  });

  const destroy = () => {
    if (resizeObserver) resizeObserver.disconnect();
    webgl.destroy();
    worker.terminate();
    camera.destroy();
    interaction.destroy();
    labelsController.destroy();
    overlay.remove();
  };

  return {
    store,
    webgl,
    worker,
    loadGraph,
    generateMockData,
    flyToNode: (nodeId, targetZoom, durationMs) => camera.flyToNode(nodeId, targetZoom, durationMs),
    setCameraRotation: (yaw, pitch) => camera.setCameraRotation(yaw, pitch),
    setAutoRotate: (enabled, speed) => camera.setAutoRotate(enabled, speed),
    resetCamera: () => camera.resetCamera(),
    setPhysicsParams: (params) => worker.postMessage({ type: 'SET_PARAMS', payload: params }),
    setShaderTheme: (theme) => webgl.setTheme(theme),
    setLabelsMode,
    reheatPhysics: (alpha = 0.8) => worker.postMessage({ type: 'REHEAT', payload: { alpha } }),
    getFPS: () => currentFPS,
    destroy,

    // Telemetry API
    setNodeActivity: (nodeId, activity, nodeState) => telemetry.setNodeActivity(nodeId, activity, nodeState),
    triggerEnergyBeam: (sourceId, targetId, color, durationMs) => telemetry.triggerEnergyBeam(sourceId, targetId, color, durationMs),
    pulseNode: (nodeId, durationMs, color) => telemetry.pulseNode(nodeId, durationMs, color),
    resetAllActivities: () => telemetry.resetAllActivities(),
    highlightRoute: (sourceId, targetId, keepActive) => telemetry.highlightRoute(sourceId, targetId, keepActive),

    // Morphologies & Living Emotion API
    setNodeMorphology: (nodeId, morphology) => telemetry.setNodeMorphology(nodeId, morphology),
    setEdgeMorphology: (edgeId, morphology) => telemetry.setEdgeMorphology(edgeId, morphology),
    setCognitiveEmotion: (emotion, intensity) => telemetry.setCognitiveEmotion(emotion, intensity),
    triggerTurgorPulse: (nodeId, peakDilation, durationMs, attackMs) => telemetry.triggerTurgorPulse(nodeId, peakDilation, durationMs, attackMs),
    triggerSynapticLightning: (sourceId, targetId, color, durationMs) => telemetry.triggerSynapticLightning(sourceId, targetId, color, durationMs),
    setBrainWaveOscillation: (waveType, freq, amp) => telemetry.setBrainWaveOscillation(waveType, freq, amp),

    // Empathic Listening & Synaptic Charge API
    setCognitiveCharge: (charge) => telemetry.setCognitiveCharge(charge),
    fireThinkingPulse: (colorOrOrigin, durationOrColor, color) => telemetry.fireThinkingPulse(colorOrOrigin, durationOrColor, color),
    releaseCognitiveCharge: (activeSlotId) => telemetry.releaseCognitiveCharge(activeSlotId),
  };
}
