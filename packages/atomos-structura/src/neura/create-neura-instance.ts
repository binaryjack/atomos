import { createNeuraStore } from './core/neura-store.js';
import type { NeuraEdge, NeuraNode, NeuraState, NeuraViewport } from './core/neura-store.js';
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
  setPhysicsParams: (params: Partial<PhysicsParams>) => void;
  setShaderTheme: (theme: ShaderTheme) => void;
  reheatPhysics: (alpha?: number) => void;
  getFPS: () => number;
  destroy: () => void;
}

// Inline Web Worker script for zero-dependency execution across any bundler/runtime
const INLINE_WORKER_SCRIPT = `
let nodes = [];
let edges = [];
let isRunning = false;
let globalAlpha = 1.0;
const alphaMin = 0.001;

let params = {
  attractionForce: 0.05,
  appartenanceGravity: 0.1,
  repulsionForce: 0.02,
  restingDistance: 40,
  idealRadius: 600,
  globalGravity: 0.001,
  alphaDecay: 0.96
};

const calculateAppartenanceCenters = () => {
  const centers = {};
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!centers[node.appartenanceId]) {
      centers[node.appartenanceId] = { sumX: 0, sumY: 0, count: 0 };
    }
    const c = centers[node.appartenanceId];
    c.sumX += node.x;
    c.sumY += node.y;
    c.count += 1;
  }
  const result = {};
  for (const key in centers) {
    const c = centers[key];
    result[key] = { x: c.sumX / c.count, y: c.sumY / c.count };
  }
  return result;
};

const simulateTick = () => {
  const centers = calculateAppartenanceCenters();
  const nodeMap = new Map();
  for (let i = 0; i < nodes.length; i++) nodeMap.set(nodes[i].id, nodes[i]);

  // 1. Attraction (Edges)
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const diff = (dist - params.restingDistance) / dist;
    const force = diff * params.attractionForce * (edge.weight || 1) * globalAlpha;

    source.x += dx * force;
    source.y += dy * force;
    target.x -= dx * force;
    target.y -= dy * force;
  }

  // 2. Cluster grouping
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const center = centers[node.appartenanceId];
    if (center) {
      const dx = center.x - node.x;
      const dy = center.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = (dist - params.idealRadius) / dist;
      node.x += dx * diff * params.appartenanceGravity * globalAlpha;
      node.y += dy * diff * params.appartenanceGravity * globalAlpha;
    }
  }

  // 3. Centering gravity
  if (params.globalGravity > 0) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      node.x -= node.x * params.globalGravity * globalAlpha;
      node.y -= node.y * params.globalGravity * globalAlpha;
    }
  }
};

const tickLoop = () => {
  if (!isRunning) return;
  simulateTick();
  const positions = nodes.map(n => ({ id: n.id, x: n.x, y: n.y }));
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
    nodes = payload.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, appartenanceId: n.appartenanceId }));
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

export function createNeuraInstance(
  canvas: HTMLCanvasElement,
  options: NeuraInstanceOptions | string | URL = {}
): NeuraInstance {
  const opts: NeuraInstanceOptions =
    typeof options === 'string' || options instanceof URL
      ? { worker: options }
      : options;

  const { store, setViewport } = createNeuraStore();
  const webgl = new WebGLEngine(canvas);
  if (opts.theme) webgl.setTheme(opts.theme);

  const culling = new CullingSystem(200);

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
      const positions = e.data.payload as Array<{ id: string; x: number; y: number }>;
      const state = store.value;
      const nextNodes = { ...state.nodes };
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]!;
        if (nextNodes[pos.id]) {
          nextNodes[pos.id] = { ...nextNodes[pos.id]!, x: pos.x, y: pos.y };
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

  // Pan & Zoom gestures
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const state = store.value;
      setViewport({
        x: state.viewport.x + dx / state.viewport.zoom,
        y: state.viewport.y + dy / state.viewport.zoom,
      });
    } else {
      // Hover detection
      const state = store.value;
      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const worldX = offsetX / state.viewport.zoom - state.viewport.x;
      const worldY = offsetY / state.viewport.zoom - state.viewport.y;

      let closestNodeId: string | null = null;
      let minDistance = 20 / state.viewport.zoom;

      for (const key in state.nodes) {
        const n = state.nodes[key]!;
        const dx = worldX - n.x;
        const dy = worldY - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = minDistance + (n.weight * 20) / state.viewport.zoom;

        if (dist < hitRadius && dist < minDistance) {
          minDistance = dist;
          closestNodeId = n.id;
        }
      }

      if (state.hoveredNodeId !== closestNodeId) {
        store.set({ ...state, hoveredNodeId: closestNodeId });
        if (opts.onNodeHover) {
          opts.onNodeHover(closestNodeId ? state.nodes[closestNodeId] ?? null : null);
        }
      }
    }
  });

  canvas.addEventListener('click', () => {
    const state = store.value;
    const newSelectedId = state.hoveredNodeId !== state.selectedNodeId ? state.hoveredNodeId : null;
    store.set({ ...state, selectedNodeId: newSelectedId });
    if (opts.onNodeClick) {
      opts.onNodeClick(newSelectedId ? state.nodes[newSelectedId] ?? null : null);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const state = store.value;
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.05, Math.min(state.viewport.zoom * zoomDelta, 8.0));
    setViewport({ zoom: newZoom });
  });

  // Camera Fly-To with cubic ease-out
  let animationRaf: number | null = null;
  const flyToNode = (nodeId: string, targetZoom = 1.8, durationMs = 600) => {
    const state = store.value;
    const node = state.nodes[nodeId];
    if (!node) return;

    if (animationRaf !== null) cancelAnimationFrame(animationRaf);

    const startX = state.viewport.x;
    const startY = state.viewport.y;
    const startZoom = state.viewport.zoom;

    const canvasW = canvas.width || 800;
    const canvasH = canvas.height || 600;

    const endX = canvasW / 2 / targetZoom - node.x;
    const endY = canvasH / 2 / targetZoom - node.y;
    const endZoom = targetZoom;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      // Cubic ease out
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

  // Render loop
  webgl.startLoop(() => {
    const state = store.value;

    // FPS calculation
    frameCount++;
    const now = performance.now();
    if (now - lastFrameTime >= 1000) {
      currentFPS = Math.round((frameCount * 1000) / (now - lastFrameTime));
      frameCount = 0;
      lastFrameTime = now;
      if (opts.onFPS) opts.onFPS(currentFPS);
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

    // 3. Render WebGL
    webgl.render(visibleNodes, visibleEdges, state.viewport, activeNodeIds, activeEdgeIds, !!focusId);

    // 4. HTML Overlay Labels for high-degree hubs or focused node
    const renderedIds = new Set<string>();
    for (const node of visibleNodes) {
      if (node.weight >= 0.95 || node.id === focusId) {
        renderedIds.add(node.id);
        let el = labelsMap.get(node.id);
        if (!el) {
          el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.fontFamily = 'var(--vbs-font, system-ui, -apple-system, sans-serif)';
          el.style.textShadow = '0 2px 6px rgba(0,0,0,0.9)';
          el.style.transform = 'translate(-50%, -100%)';
          el.style.marginTop = '-14px';
          el.style.whiteSpace = 'nowrap';
          el.innerText = node.metadata?.name || `Node ${node.id}`;
          overlay.appendChild(el);
          labelsMap.set(node.id, el);
        }

        const screenX = (node.x + state.viewport.x) * state.viewport.zoom;
        const screenY = (node.y + state.viewport.y) * state.viewport.zoom;

        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;

        if (node.id === focusId) {
          el.style.zIndex = '100';
          el.style.color = '#38bdf8';
          el.style.fontSize = '13px';
          el.style.fontWeight = 'bold';
        } else {
          el.style.zIndex = '10';
          el.style.color = '#e2e8f0';
          el.style.fontSize = '11px';
          el.style.fontWeight = '500';
        }
      }
    }

    for (const [id, el] of labelsMap.entries()) {
      if (!renderedIds.has(id)) {
        el.remove();
        labelsMap.delete(id);
      }
    }
  });

  const loadGraph = (nodes: NeuraNode[], edges: NeuraEdge[]) => {
    const state = store.value;
    const nodeMap: Record<string, NeuraNode> = {};
    const edgeMap: Record<string, NeuraEdge> = {};
    for (const n of nodes) nodeMap[n.id] = n;
    for (const e of edges) edgeMap[e.id] = e;

    store.set({
      ...state,
      nodes: nodeMap,
      edges: edgeMap,
      hoveredNodeId: null,
      selectedNodeId: null,
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

      const spread = Math.sqrt(numNodes) * 45;
      const r_pos = Math.sqrt(Math.random()) * spread;
      const theta = Math.random() * 2 * Math.PI;

      nodes.push({
        id,
        x: r_pos * Math.cos(theta),
        y: r_pos * Math.sin(theta),
        weight: 0,
        appartenanceId: `cluster_${clusterIdx}`,
        metadata: {
          name: `Service #${i}`,
          cluster: `Zone ${clusterIdx + 1}`,
        },
        visible: true,
      });
    }

    let maxDegree = 1;
    for (const key in degrees) {
      if (degrees[key]! > maxDegree) maxDegree = degrees[key]!;
    }
    for (const n of nodes) {
      const degree = degrees[n.id] || 0;
      n.weight = Math.max(0.08, degree / maxDegree);
    }

    loadGraph(nodes, edges);
  };

  return {
    store,
    webgl,
    worker,
    loadGraph,
    generateMockData,
    flyToNode,
    setPhysicsParams: (params: Partial<PhysicsParams>) => {
      worker.postMessage({ type: 'SET_PARAMS', payload: params });
    },
    setShaderTheme: (theme: ShaderTheme) => {
      webgl.setTheme(theme);
    },
    reheatPhysics: (alpha = 0.9) => {
      worker.postMessage({ type: 'REHEAT', payload: { alpha } });
    },
    getFPS: () => currentFPS,
    destroy: () => {
      if (animationRaf !== null) cancelAnimationFrame(animationRaf);
      resizeObserver.disconnect();
      webgl.destroy();
      worker.terminate();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    },
  };
}
