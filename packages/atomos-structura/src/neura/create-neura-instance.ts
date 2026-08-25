import { createNeuraStore } from './core/neura-store.js';
import type {
  NeuraEdge,
  NeuraEnergyBeam,
  NeuraNode,
  NeuraViewport,
  NodeActivityState,
  ThinkingPulseState,
} from './core/neura-store.js';
import { CullingSystem } from './renderer/culling-system.js';
import { type ShaderTheme, WebGLEngine } from './renderer/webgl-engine.js';
import type { PhysicsParams } from './physics/worker.js';

export interface NeuraInstanceOptions {
  worker?: Worker | string | URL;
  theme?: ShaderTheme;
  physicsParams?: Partial<PhysicsParams>;
  onNodeClick?: (node: NeuraNode | null) => void;
  onNodeHover?: (node: NeuraNode | null) => void;
  onFPS?: (fps: number) => void;
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
  reheatPhysics: (alpha?: number) => void;
  getFPS: () => number;
  destroy: () => void;

  // Telemetry & Illumination API
  setNodeActivity: (nodeId: string, activity: number, state?: NodeActivityState) => void;
  triggerEnergyBeam: (sourceId: string, targetId: string, color?: string, durationMs?: number) => void;
  pulseNode: (nodeId: string, durationMs?: number, color?: string) => void;
  resetAllActivities: () => void;
  highlightRoute: (sourceId: string, targetId: string, keepActive?: boolean) => void;

  // Empathic Listening & Synaptic Charge API
  setCognitiveCharge: (level: number, originSlotId?: number) => void;
  fireThinkingPulse: (color?: string) => void;
  releaseCognitiveCharge: (activeSlotId: number) => void;
}

// Inline Web Worker script for 3D physics simulation
const INLINE_WORKER_SCRIPT = `
let nodes = [];
let edges = [];
let isRunning = false;
let globalAlpha = 1.0;
const alphaMin = 0.001;

let params = {
  attractionForce: 0.05,
  appartenanceGravity: 0.08,
  repulsionForce: 0.02,
  restingDistance: 45,
  idealRadius: 180,
  zSpread: 1.0,
  globalGravity: 0.0005,
  alphaDecay: 0.97
};

const calculateAppartenanceCenters = () => {
  const centers = {};
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!centers[node.appartenanceId]) {
      centers[node.appartenanceId] = { sumX: 0, sumY: 0, sumZ: 0, count: 0 };
    }
    const c = centers[node.appartenanceId];
    c.sumX += node.x;
    c.sumY += node.y;
    c.sumZ += node.z;
    c.count += 1;
  }
  const result = {};
  for (const key in centers) {
    const c = centers[key];
    result[key] = { x: c.sumX / c.count, y: c.sumY / c.count, z: c.sumZ / c.count };
  }
  return result;
};

const simulateTick = () => {
  const centers = calculateAppartenanceCenters();
  const nodeMap = new Map();
  for (let i = 0; i < nodes.length; i++) nodeMap.set(nodes[i].id, nodes[i]);

  // 1. Attraction (Edges) in 3D
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dz = target.z - source.z;

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const diff = (dist - params.restingDistance) / dist;
    const force = diff * params.attractionForce * (edge.weight || 1) * globalAlpha;

    source.x += dx * force;
    source.y += dy * force;
    source.z += dz * force * params.zSpread;

    target.x -= dx * force;
    target.y -= dy * force;
    target.z -= dz * force * params.zSpread;
  }

  // 2. Cluster grouping in 3D
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const center = centers[node.appartenanceId];
    if (center) {
      const dx = center.x - node.x;
      const dy = center.y - node.y;
      const dz = center.z - node.z;

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const diff = (dist - params.idealRadius) / dist;

      node.x += dx * diff * params.appartenanceGravity * globalAlpha;
      node.y += dy * diff * params.appartenanceGravity * globalAlpha;
      node.z += dz * diff * params.appartenanceGravity * params.zSpread * globalAlpha;
    }
  }

  // 3. Centering gravity in 3D
  if (params.globalGravity > 0) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x -= node.x * params.globalGravity * globalAlpha;
      node.y -= node.y * params.globalGravity * globalAlpha;
      node.z -= node.z * params.globalGravity * globalAlpha;
    }
  }
};

const tickLoop = () => {
  if (!isRunning) return;
  simulateTick();
  const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y, z: n.z }));
  self.postMessage({ type: 'TICK_RESULT', payload: positions });
  globalAlpha *= params.alphaDecay;
  if (globalAlpha < alphaMin) {
    isRunning = false;
    return;
  }
  setTimeout(tickLoop, 33);
};

self.onmessage = (event) => {
  const { type, payload } = event.data;
  if (type === 'INIT_DATA') {
    nodes = payload.nodes.map((n, idx) => {
      const zInit = n.z ?? ((idx % 7 - 3) * 20 + Math.sin(idx) * 30);
      return { id: n.id, x: n.x, y: n.y, z: zInit, appartenanceId: n.appartenanceId };
    });
    edges = payload.edges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId, weight: e.weight }));
    globalAlpha = 1.0;
  } else if (type === 'SET_PARAMS') {
    params = { ...params, ...payload };
  } else if (type === 'REHEAT') {
    globalAlpha = Math.max(globalAlpha, payload?.alpha ?? 0.8);
    if (!isRunning) {
      isRunning = true;
      tickLoop();
    }
  } else if (type === 'START') {
    if (!isRunning) {
      isRunning = true;
      globalAlpha = 1.0;
      tickLoop();
    }
  } else if (type === 'STOP') {
    isRunning = false;
  }
};
`;

export const createNeuraPhysicsWorker = (): Worker => {
  const blob = new Blob([INLINE_WORKER_SCRIPT], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return new Worker(url);
};

// ---------------------------------------------------------------------------
// BFS Shortest Path Helper
// ---------------------------------------------------------------------------

function bfsShortestPath(
  sourceId: string,
  targetId: string,
  edges: Record<string, NeuraEdge>
): string[] | null {
  const adjacency = new Map<string, Array<{ neighborId: string; edgeId: string }>>();

  for (const key in edges) {
    const edge = edges[key]!;
    if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
    if (!adjacency.has(edge.targetId)) adjacency.set(edge.targetId, []);
    adjacency.get(edge.sourceId)!.push({ neighborId: edge.targetId, edgeId: edge.id });
    adjacency.get(edge.targetId)!.push({ neighborId: edge.sourceId, edgeId: edge.id });
  }

  if (!adjacency.has(sourceId) || !adjacency.has(targetId)) return null;

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: sourceId, path: [] },
  ];
  visited.add(sourceId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current.nodeId) ?? [];

    for (const { neighborId, edgeId } of neighbors) {
      if (visited.has(neighborId)) continue;
      const newPath = [...current.path, edgeId];

      if (neighborId === targetId) return newPath;

      visited.add(neighborId);
      queue.push({ nodeId: neighborId, path: newPath });
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Beam ID Generator
// ---------------------------------------------------------------------------

let beamCounter = 0;
function generateBeamId(): string {
  beamCounter++;
  return `beam_${beamCounter}_${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Create Neura Instance
// ---------------------------------------------------------------------------

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
    setNodeActivity: storeSetNodeActivity,
    addEnergyBeam,
    setCognitiveChargeStore,
    setThinkingPulseStore,
    resetAllActivities: storeResetAllActivities,
  } = createNeuraStore();

  const webgl = new WebGLEngine(canvas);
  if (opts.theme) webgl.setTheme(opts.theme);

  const culling = new CullingSystem(600);

  // Initialize Worker
  let worker: Worker;
  if (opts.worker instanceof Worker) {
    worker = opts.worker;
  } else if (typeof opts.worker === 'string' || opts.worker instanceof URL) {
    try {
      worker = new Worker(opts.worker, { type: 'module' });
    } catch {
      worker = createNeuraPhysicsWorker();
    }
  } else {
    worker = createNeuraPhysicsWorker();
  }

  if (opts.physicsParams) {
    worker.postMessage({ type: 'SET_PARAMS', payload: opts.physicsParams });
  }

  // Setup Overlay container
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

  const labelsMap = new Map<string, HTMLDivElement>();

  // FPS calculation
  let lastFrameTime = performance.now();
  let frameCount = 0;
  let currentFPS = 60;

  worker.onmessage = (e) => {
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

  // Resize handler
  const resizeObserver = new ResizeObserver((entries) => {
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

  // 3D Orbit & Pan gestures
  let isDragging = false;
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    isPanning = e.button === 2 || e.button === 1 || e.shiftKey;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    isPanning = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      handleDragMove(e);
    } else {
      handleHoverDetection(e);
    }
  });

  function handleDragMove(e: MouseEvent) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const state = store.value;

    if (isPanning) {
      // 3D Camera Pan in screen space
      const zoom = Math.max(0.01, state.viewport.zoom);
      const panSpeed = (950 / zoom) / (canvas.clientHeight || 600);
      const yaw = state.viewport.yaw ?? 0;

      const panX = - (dx * Math.cos(yaw) * panSpeed);
      const panY = dy * panSpeed;

      setViewport({
        x: state.viewport.x + panX,
        y: state.viewport.y + panY,
      });
    } else {
      // 3D Orbital Rotation (Left Click Drag)
      const currentYaw = state.viewport.yaw ?? 0;
      const currentPitch = state.viewport.pitch ?? 0;

      const newYaw = currentYaw - dx * 0.007;
      const newPitch = Math.max(-1.4, Math.min(1.4, currentPitch + dy * 0.007));

      setViewport({
        yaw: newYaw,
        pitch: newPitch,
      });
    }
  }

  function handleHoverDetection(e: MouseEvent) {
    // 3D Ray-cast hover detection using computed MVP matrix
    const state = store.value;
    const mvp = webgl.computeMVPMatrix(state.viewport);
    const canvasW = canvas.width || 800;
    const canvasH = canvas.height || 600;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closestNodeId: string | null = null;
    let minDistance = 22;

    for (const key in state.nodes) {
      const n = state.nodes[key]!;
      const nx = n.x;
      const ny = n.y;
      const nz = n.z ?? 0;

      const clipX = mvp[0]! * nx + mvp[4]! * ny + mvp[8]! * nz + mvp[12]!;
      const clipY = mvp[1]! * nx + mvp[5]! * ny + mvp[9]! * nz + mvp[13]!;
      const clipW = mvp[3]! * nx + mvp[7]! * ny + mvp[11]! * nz + mvp[15]!;

      if (clipW > 0.1) {
        const sx = (clipX / clipW * 0.5 + 0.5) * canvasW;
        const sy = (1.0 - (clipY / clipW * 0.5 + 0.5)) * canvasH;

        const dist = Math.hypot(mouseX - sx, mouseY - sy);
        const hitRadius = minDistance + (Math.min(20, n.weight) * 2);

        if (dist < hitRadius && dist < minDistance) {
          minDistance = dist;
          closestNodeId = n.id;
        }
      }
    }

    if (state.hoveredNodeId !== closestNodeId) {
      store.set({ ...state, hoveredNodeId: closestNodeId });
      if (opts.onNodeHover) {
        opts.onNodeHover(closestNodeId ? state.nodes[closestNodeId] ?? null : null);
      }
    }
  }

  canvas.addEventListener('click', () => {
    const state = store.value;
    const newSelectedId = state.hoveredNodeId !== state.selectedNodeId ? state.hoveredNodeId : null;
    store.set({ ...state, selectedNodeId: newSelectedId });
    if (opts.onNodeClick) {
      opts.onNodeClick(newSelectedId ? state.nodes[newSelectedId] ?? null : null);
    }
  });

  // Mouse Wheel: 3D Dolly Distance Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const state = store.value;
    const zoomDelta = e.deltaY < 0 ? 1.15 : 0.85;
    const oldZoom = state.viewport.zoom;
    const newZoom = Math.max(0.02, Math.min(oldZoom * zoomDelta, 8.0));

    if (newZoom === oldZoom) return;

    setViewport({
      zoom: newZoom,
    });
  });

  // Camera Fly-To with cubic ease-out
  let animationRaf: number | null = null;
  const flyToNode = (nodeId: string, targetZoom = 1.2, durationMs = 600) => {
    const state = store.value;
    const node = state.nodes[nodeId];
    if (!node) return;

    if (animationRaf !== null) cancelAnimationFrame(animationRaf);

    const startX = state.viewport.x;
    const startY = state.viewport.y;
    const startZoom = state.viewport.zoom;

    const endX = node.x;
    const endY = node.y;
    const endZoom = targetZoom;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 3);

      const curX = startX + (endX - startX) * ease;
      const curY = startY + (endY - startY) * ease;
      const curZoom = startZoom + (endZoom - startZoom) * ease;

      setViewport({ x: curX, y: curY, zoom: curZoom });

      if (progress < 1.0) {
        animationRaf = requestAnimationFrame(animate);
      } else {
        animationRaf = null;
        store.set({ ...store.value, selectedNodeId: nodeId });
      }
    };

    animationRaf = requestAnimationFrame(animate);
  };

  const setCameraRotation = (yaw: number, pitch: number) => {
    setViewport({ yaw, pitch: Math.max(-1.4, Math.min(1.4, pitch)) });
  };

  const setAutoRotate = (enabled: boolean, speed = 0.5) => {
    setViewport({ autoRotate: enabled, autoRotateSpeed: speed });
  };

  const resetCamera = () => {
    const canvasW = canvas.width || 1200;
    const canvasH = canvas.height || 800;
    setViewport({
      x: 0,
      y: 0,
      zoom: 0.35,
      yaw: 0,
      pitch: 0,
      width: canvasW,
      height: canvasH,
    });
  };

  // ---------------------------------------------------------------------------
  // Render Loop (with beam progress management & cognitive state)
  // ---------------------------------------------------------------------------

  webgl.startLoop(() => {
    const state = store.value;

    // Auto-Rotate 3D Nebula if active
    if (state.viewport.autoRotate && !isDragging) {
      const currentYaw = state.viewport.yaw ?? 0;
      const speed = (state.viewport.autoRotateSpeed ?? 0.5) * 0.004;
      setViewport({ yaw: (currentYaw + speed) % (2 * Math.PI) });
    }

    // FPS calculation
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
      currentFPS = Math.round((frameCount * 1000) / (now - lastFrameTime));
      frameCount = 0;
      lastFrameTime = now;
      if (opts.onFPS) opts.onFPS(currentFPS);
    }

    // Advance beam progress and prune completed beams
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

    // 1. Cull off-screen items
    const { visibleNodes, visibleEdges } = culling.cull(state.nodes, state.edges, state.viewport);

    // 2. Active Focus (hover or select)
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

    // 3. Render WebGL 3D (with energy beams, cognitive charge & thinking pulse)
    webgl.render(
      visibleNodes,
      visibleEdges,
      state.viewport,
      activeNodeIds,
      activeEdgeIds,
      !!focusId,
      liveBeams,
      state.cognitiveCharge,
      currentPulse
    );

    // 4. HTML Overlay Labels projected in 3D
    renderOverlayLabels(visibleNodes, state, focusId);
  });

  // ---------------------------------------------------------------------------
  // Beam Lifecycle
  // ---------------------------------------------------------------------------

  function pruneCompletedBeams(beams: NeuraEnergyBeam[], nowMs: number): NeuraEnergyBeam[] {
    return beams.filter(beam => {
      const elapsed = nowMs - beam.startedAt;
      return elapsed < beam.durationMs;
    });
  }

  // ---------------------------------------------------------------------------
  // Overlay Labels
  // ---------------------------------------------------------------------------

  function renderOverlayLabels(
    visibleNodes: NeuraNode[],
    state: { viewport: NeuraViewport; hoveredNodeId: string | null; selectedNodeId: string | null },
    focusId: string | null
  ) {
    const renderedIds = new Set<string>();
    const isZoomedIn = state.viewport.zoom >= 0.7;
    const mvp = webgl.computeMVPMatrix(state.viewport);
    const canvasW = canvas.width || 800;
    const canvasH = canvas.height || 600;

    for (const node of visibleNodes) {
      const isFocused = node.id === focusId;
      const isMajorFile = isZoomedIn && node.metadata?.kind === 'file';
      const isActive = (node.activity ?? 0) > 0.3;

      if (isFocused || isMajorFile || isActive) {
        const nx = node.x;
        const ny = node.y;
        const nz = node.z ?? 0;

        const clipX = mvp[0]! * nx + mvp[4]! * ny + mvp[8]! * nz + mvp[12]!;
        const clipY = mvp[1]! * nx + mvp[5]! * ny + mvp[9]! * nz + mvp[13]!;
        const clipW = mvp[3]! * nx + mvp[7]! * ny + mvp[11]! * nz + mvp[15]!;

        if (clipW > 0.1) {
          const screenX = (clipX / clipW * 0.5 + 0.5) * canvasW;
          const screenY = (1.0 - (clipY / clipW * 0.5 + 0.5)) * canvasH;

          renderedIds.add(node.id);
          let el = labelsMap.get(node.id);
          if (!el) {
            el = document.createElement('div');
            el.style.position = 'absolute';
            el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            el.style.transform = 'translate(-50%, -100%)';
            el.style.marginTop = '-12px';
            el.style.whiteSpace = 'nowrap';
            el.style.pointerEvents = 'none';
            el.style.borderRadius = '4px';
            el.style.padding = '2px 6px';
            el.style.backdropFilter = 'blur(6px)';
            el.style.transition = 'opacity 0.15s ease';
            overlay.appendChild(el);
            labelsMap.set(node.id, el);
          }

          const labelText = (node.metadata?.label ?? node.metadata?.name ?? node.id) as string;
          el.innerText = labelText;

          el.style.left = `${screenX}px`;
          el.style.top = `${screenY}px`;

          if (isFocused) {
            el.style.zIndex = '100';
            el.style.color = '#38bdf8';
            el.style.background = 'rgba(15, 23, 42, 0.85)';
            el.style.border = '1px solid rgba(56, 189, 248, 0.4)';
            el.style.fontSize = '12px';
            el.style.fontWeight = 'bold';
            el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.6)';
          } else if (isActive) {
            // Active telemetry nodes get highlighted labels
            el.style.zIndex = '50';
            el.style.color = '#fbbf24';
            el.style.background = 'rgba(15, 23, 42, 0.8)';
            el.style.border = '1px solid rgba(251, 191, 36, 0.4)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '600';
            el.style.boxShadow = '0 3px 8px rgba(0,0,0,0.5)';
          } else {
            el.style.zIndex = '10';
            el.style.color = '#cbd5e1';
            el.style.background = 'rgba(15, 23, 42, 0.7)';
            el.style.border = '1px solid rgba(148, 163, 184, 0.2)';
            el.style.fontSize = '11px';
            el.style.fontWeight = '500';
            el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
          }
        }
      }
    }

    for (const [id, el] of labelsMap.entries()) {
      if (!renderedIds.has(id)) {
        el.remove();
        labelsMap.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Graph Loading & Mock Data
  // ---------------------------------------------------------------------------

  const loadGraph = (nodes: NeuraNode[], edges: NeuraEdge[]) => {
    const state = store.value;
    const nodeMap: Record<string, NeuraNode> = {};
    const edgeMap: Record<string, NeuraEdge> = {};
    for (const n of nodes) nodeMap[n.id] = n;
    for (const e of edges) edgeMap[e.id] = e;

    const canvasW = canvas.width || 1200;
    const canvasH = canvas.height || 800;

    // Centered wide-angle 3D constellation view
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
    const nodes: NeuraNode[] = [];
    const edges: NeuraEdge[] = [];
    const degrees: Record<string, number> = {};
    let totalDegree = 0;
    const m = 2;
    const m0 = Math.min(5, numNodes);
    const numClusters = Math.max(4, Math.floor(numNodes / 150));

    for (let i = 0; i < numNodes; i++) {
      const id = `n${i}`;
      degrees[id] = 0;
      let clusterIdx = i % numClusters;

      if (i < m0) {
        for (let j = 0; j < i; j++) {
          const targetId = `n${j}`;
          edges.push({ id: `e${edges.length}`, sourceId: id, targetId, weight: 1, visible: true });
          degrees[id]!++;
          degrees[targetId]!++;
          totalDegree += 2;
        }
      } else {
        const targets = new Set<string>();
        let attempts = 0;
        while (targets.size < m && targets.size < i && attempts < 40) {
          attempts++;
          let r = Math.random() * totalDegree;
          let selectedTarget = 'n0';
          for (let j = 0; j < i; j++) {
            const tj = `n${j}`;
            r -= degrees[tj] || 0;
            if (r <= 0) {
              selectedTarget = tj;
              break;
            }
          }
          targets.add(selectedTarget);
        }

        let first = true;
        for (const targetId of targets) {
          edges.push({ id: `e${edges.length}`, sourceId: id, targetId, weight: 1, visible: true });
          degrees[id]!++;
          degrees[targetId] = (degrees[targetId] || 0) + 1;
          totalDegree += 2;

          if (first) {
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode) {
              const clusterMatch = targetNode.appartenanceId.match(/\d+/);
              if (clusterMatch) clusterIdx = Number(clusterMatch[0]);
            }
            first = false;
          }
        }
      }

      // Spherical distribution in 3D
      const spread = Math.sqrt(numNodes) * 45;
      const r_pos = Math.sqrt(Math.random()) * spread;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);

      nodes.push({
        id,
        x: r_pos * Math.sin(phi) * Math.cos(theta),
        y: r_pos * Math.sin(phi) * Math.sin(theta),
        z: r_pos * Math.cos(phi) * 0.7,
        weight: 0,
        appartenanceId: `cluster_${clusterIdx}`,
        metadata: {
          label: `Node ${i}`,
          appartenance: `Cluster ${clusterIdx}`,
        },
        visible: true,
      });
    }

    // Normalize degrees
    let maxDegree = 1;
    for (const id in degrees) {
      if (degrees[id]! > maxDegree) maxDegree = degrees[id]!;
    }
    for (const node of nodes) {
      node.weight = degrees[node.id]! / maxDegree;
    }

    loadGraph(nodes, edges);
  };

  // ---------------------------------------------------------------------------
  // Telemetry & Illumination API
  // ---------------------------------------------------------------------------

  const setNodeActivity = (nodeId: string, activity: number, nodeState?: NodeActivityState) => {
    storeSetNodeActivity(nodeId, activity, nodeState);
  };

  const triggerEnergyBeam = (
    sourceId: string,
    targetId: string,
    color = '#00d4ff',
    durationMs = 800
  ) => {
    const beam: NeuraEnergyBeam = {
      id: generateBeamId(),
      sourceId,
      targetId,
      progress: 0,
      color,
      durationMs,
      startedAt: performance.now(),
    };
    addEnergyBeam(beam);
  };

  const pulseNode = (nodeId: string, durationMs = 400, _color?: string) => {
    const state = store.value;
    const node = state.nodes[nodeId];
    if (!node) return;

    const previousActivity = node.activity ?? 0;
    storeSetNodeActivity(nodeId, 1.0, node.state ?? 'firing');

    // Decay back to previous level
    const startTime = performance.now();
    const decayLoop = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      const ease = 1 - Math.pow(1 - progress, 2); // quadratic ease-out
      const currentActivity = 1.0 - (1.0 - previousActivity) * ease;

      storeSetNodeActivity(nodeId, currentActivity);

      if (progress < 1.0) {
        requestAnimationFrame(decayLoop);
      }
    };
    requestAnimationFrame(decayLoop);
  };

  const resetAllActivities = () => {
    storeResetAllActivities();
  };

  const highlightRoute = (sourceId: string, targetId: string, keepActive = false) => {
    const state = store.value;
    const edgePath = bfsShortestPath(sourceId, targetId, state.edges);
    if (!edgePath || edgePath.length === 0) return;

    // Activate source and target nodes
    storeSetNodeActivity(sourceId, 0.8, 'routing');
    storeSetNodeActivity(targetId, 0.8, 'active');

    // Fire sequential beams along the path
    let delay = 0;
    const beamDuration = 600;
    const stepDelay = 300;

    for (const edgeId of edgePath) {
      const edge = state.edges[edgeId];
      if (!edge) continue;

      const capturedSourceId = edge.sourceId;
      const capturedTargetId = edge.targetId;

      setTimeout(() => {
        triggerEnergyBeam(capturedSourceId, capturedTargetId, '#00d4ff', beamDuration);
        if (keepActive) {
          storeSetNodeActivity(capturedSourceId, 0.6, 'routing');
          storeSetNodeActivity(capturedTargetId, 0.6, 'routing');
        }
      }, delay);

      delay += stepDelay;
    }
  };

  // ---------------------------------------------------------------------------
  // Empathic Listening & Synaptic Charge API
  // ---------------------------------------------------------------------------

  const setCognitiveCharge = (level: number, originSlotId?: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, level));
    setCognitiveChargeStore(clamped);

    // If active charge accumulates, trigger micro-impulses on ALTYN center / origin slot edges
    if (clamped > 0.05) {
      const state = store.value;
      const centralNodeId = originSlotId !== undefined
        ? (`slot-${originSlotId}` in state.nodes ? `slot-${originSlotId}` : `n${originSlotId}`)
        : (state.nodes['n0'] ? 'n0' : Object.keys(state.nodes)[0]);

      if (centralNodeId && state.nodes[centralNodeId]) {
        // Find connected edges to central node
        const connectedEdges = Object.values(state.edges).filter(
          e => e.sourceId === centralNodeId || e.targetId === centralNodeId
        );

        if (connectedEdges.length > 0) {
          // Select 1-2 edges for micro-pulses proportional to charge
          const edge = connectedEdges[Math.floor(Math.random() * connectedEdges.length)];
          if (edge) {
            triggerEnergyBeam(edge.sourceId, edge.targetId, '#38bdf8', 600);
          }
        }
      }
    }
  };

  const fireThinkingPulse = (color = '#38bdf8') => {
    const state = store.value;
    // Calculate max 3D radius from graph nodes
    let maxR = 1200;
    for (const key in state.nodes) {
      const n = state.nodes[key]!;
      const r = Math.hypot(n.x, n.y, n.z ?? 0);
      if (r > maxR) maxR = r;
    }

    setThinkingPulseStore({
      active: true,
      startTime: performance.now(),
      durationMs: 1200,
      color,
      origin: [0, 0, 0],
      maxRadius: maxR * 1.2,
    });
  };

  const releaseCognitiveCharge = (activeSlotId: number) => {
    const state = store.value;

    // Resolve target specialist slot node ID
    const targetSlotId = `slot-${activeSlotId}` in state.nodes
      ? `slot-${activeSlotId}`
      : `n${activeSlotId}` in state.nodes
      ? `n${activeSlotId}`
      : Object.keys(state.nodes)[0];

    if (targetSlotId && state.nodes[targetSlotId]) {
      // Find neighboring nodes connecting to the active specialist slot
      const connectedEdges = Object.values(state.edges).filter(
        e => e.sourceId === targetSlotId || e.targetId === targetSlotId
      );

      // Fire converging energy beams towards the active slot
      for (const edge of connectedEdges) {
        const source = edge.sourceId === targetSlotId ? edge.targetId : edge.sourceId;
        triggerEnergyBeam(source, targetSlotId, '#f59e0b', 700);
      }

      // Highlight active specialist slot node
      storeSetNodeActivity(targetSlotId, 1.0, 'active');
    }

    // Smoothly decay cognitive charge back to 0.0 rest level over 800ms
    const startCharge = state.cognitiveCharge;
    const startTime = performance.now();

    const decayLoop = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / 800);
      const ease = 1 - Math.pow(1 - progress, 2); // quadratic ease-out
      const currentCharge = startCharge * (1.0 - ease);

      setCognitiveChargeStore(currentCharge);

      if (progress < 1.0) {
        requestAnimationFrame(decayLoop);
      }
    };

    requestAnimationFrame(decayLoop);
  };

  // ---------------------------------------------------------------------------
  // Standard Controls
  // ---------------------------------------------------------------------------

  const setPhysicsParams = (params: Partial<PhysicsParams>) => {
    worker.postMessage({ type: 'SET_PARAMS', payload: params });
  };

  const setShaderTheme = (theme: ShaderTheme) => {
    webgl.setTheme(theme);
  };

  const reheatPhysics = (alpha = 0.8) => {
    worker.postMessage({ type: 'REHEAT', payload: { alpha } });
  };

  const getFPS = () => currentFPS;

  const destroy = () => {
    resizeObserver.disconnect();
    webgl.destroy();
    worker.terminate();
    if (animationRaf !== null) cancelAnimationFrame(animationRaf);
    overlay.remove();
  };

  return {
    store,
    webgl,
    worker,
    loadGraph,
    generateMockData,
    flyToNode,
    setCameraRotation,
    setAutoRotate,
    resetCamera,
    setPhysicsParams,
    setShaderTheme,
    reheatPhysics,
    getFPS,
    destroy,
    // Telemetry API
    setNodeActivity,
    triggerEnergyBeam,
    pulseNode,
    resetAllActivities,
    highlightRoute,
    // Empathic Listening & Synaptic Charge API
    setCognitiveCharge,
    fireThinkingPulse,
    releaseCognitiveCharge,
  };
}
