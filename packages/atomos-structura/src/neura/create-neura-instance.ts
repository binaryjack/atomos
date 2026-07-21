import { createNeuraStore } from './core/neura-store.js';
import type { NeuraState } from './core/neura-store.js';
import { WebGLEngine } from './renderer/webgl-engine.js';
import { CullingSystem } from './renderer/culling-system.js';

export function createNeuraInstance(canvas: HTMLCanvasElement, workerUrl: string | URL) {
  const { store, setViewport, addNodes, addEdges } = createNeuraStore();
  const webgl = new WebGLEngine(canvas);
  const culling = new CullingSystem(200);
  
  // Initialize Physics Worker
  const worker = new Worker(workerUrl, { type: 'module' });
  
  // Setup Overlay container
  const parent = canvas.parentElement;
  if (parent) {
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
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

  worker.onmessage = (e) => {
    if (e.data.type === 'TICK_RESULT') {
      const positions = e.data.payload as { id: string, x: number, y: number }[];
      // Update store positions
      const state = store.value;
      const nextNodes = { ...state.nodes };
      for (const pos of positions) {
        if (nextNodes[pos.id]) {
          nextNodes[pos.id] = { ...nextNodes[pos.id]!, x: pos.x, y: pos.y };
        }
      }
      store.set({ ...state, nodes: nextNodes });
    }
  };

  // Resize handler
  const resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      webgl.resize(entry.contentRect.width, entry.contentRect.height);
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    }
  });
  resizeObserver.observe(canvas.parentElement || canvas);

  // Input handling (Basic Pan & Zoom)
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mouseup', () => { isDragging = false; });
  canvas.addEventListener('mousemove', e => {
    if (isDragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      
      const state = store.value;
      setViewport({ 
        x: state.viewport.x + dx / state.viewport.zoom, 
        y: state.viewport.y + dy / state.viewport.zoom 
      });
    } else {
      // Hover detection
      const state = store.value;
      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      const worldX = (offsetX / state.viewport.zoom) - state.viewport.x;
      const worldY = (offsetY / state.viewport.zoom) - state.viewport.y;
      
      let closestNodeId: string | null = null;
      let minDistance = 15 / state.viewport.zoom; // hit radius scales with zoom
      
      for (const key in state.nodes) {
        const n = state.nodes[key]!;
        const dx = worldX - n.x;
        const dy = worldY - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Node radius is related to its weight. We give a slight bump to the hit box based on weight.
        const hitRadius = minDistance + (n.weight * 20 / state.viewport.zoom);
        
        if (dist < hitRadius && dist < minDistance) {
          minDistance = dist;
          closestNodeId = n.id;
        }
      }
      
      if (state.hoveredNodeId !== closestNodeId) {
        store.set({ ...state, hoveredNodeId: closestNodeId });
      }
    }
  });

  canvas.addEventListener('click', e => {
    const state = store.value;
    if (state.hoveredNodeId !== state.selectedNodeId) {
      store.set({ ...state, selectedNodeId: state.hoveredNodeId });
    } else if (state.hoveredNodeId === null) {
      store.set({ ...state, selectedNodeId: null });
    }
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const state = store.value;
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport({ zoom: state.viewport.zoom * zoomDelta });
  });

  // Render loop
  webgl.startLoop(() => {
    const state = store.value;
    
    // 1. Cull off-screen items
    const { visibleNodes, visibleEdges } = culling.cull(state.nodes, state.edges, state.viewport);
    
    // 2. Compute Active Focus
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
    
    // 3. Render visible items
    webgl.render(visibleNodes, visibleEdges, state.viewport, activeNodeIds, activeEdgeIds, !!focusId);
    
    // 4. Update HTML Overlay Labels
    const renderedIds = new Set<string>();
    for (const node of visibleNodes) {
      if (node.weight >= 1.0 || node.id === focusId) {
        renderedIds.add(node.id);
        let el = labelsMap.get(node.id);
        if (!el) {
          el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.fontFamily = 'var(--vbs-font, system-ui, -apple-system, sans-serif)';
          el.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
          el.style.transform = 'translate(-50%, -100%)'; // center above node
          el.style.marginTop = '-15px';
          el.style.whiteSpace = 'nowrap';
          el.innerText = node.metadata?.name || `Node ${node.id}`;
          overlay.appendChild(el);
          labelsMap.set(node.id, el);
        }
        
        // Project to screen space
        const screenX = (node.x + state.viewport.x) * state.viewport.zoom;
        const screenY = (node.y + state.viewport.y) * state.viewport.zoom;
        
        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
        
        if (node.id === focusId) {
           el.style.zIndex = '100';
           el.style.color = 'var(--vbs-accent, #3b82f6)';
           el.style.fontSize = '14px';
           el.style.fontWeight = 'bold';
        } else {
           el.style.zIndex = '10';
           el.style.color = 'var(--vbs-text-primary, #f8fafc)';
           el.style.fontSize = '12px';
           el.style.fontWeight = 'normal';
        }
      }
    }
    
    // Remove invisible labels
    for (const [id, el] of labelsMap.entries()) {
      if (!renderedIds.has(id)) {
        el.remove();
        labelsMap.delete(id);
      }
    }
  });

  // Generate Mock Data for Testing (Scale-Free Network using Barabási-Albert model)
  const generateMockData = (numNodes: number) => {
    const nodes: any[] = [];
    const edges: any[] = [];
    const degrees: Record<string, number> = {};
    let totalDegree = 0;
    const m = 2; // edges to add per new node
    const m0 = 5; // initial connected core

    for (let i = 0; i < numNodes; i++) {
      const id = `n${i}`;
      degrees[id] = 0;
      let appartenanceId = `cluster_${i}`;

      // 1. Preferential Attachment
      if (i < m0) {
        // Fully connect initial core
        for (let j = 0; j < i; j++) {
          const targetId = `n${j}`;
          edges.push({ id: `e${edges.length}`, sourceId: id, targetId, weight: 1, visible: true });
          degrees[id]!++;
          degrees[targetId]!++;
          totalDegree += 2;
        }
      } else {
        // Connect to m existing nodes, prob proportional to degree
        const targets = new Set<string>();
        let attempts = 0;
        while (targets.size < m && targets.size < i && attempts < 50) {
          attempts++;
          let r = Math.random() * totalDegree;
          let selectedTarget = `n0`;
          for (let j = 0; j < i; j++) {
            const tj = `n${j}`;
            r -= degrees[tj]!;
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
          degrees[targetId]!++;
          totalDegree += 2;

          if (first) {
            // Inherit cluster from primary attachment
            const targetNode = nodes.find(n => n.id === targetId);
            if (targetNode) appartenanceId = targetNode.appartenanceId;
            first = false;
          }
        }
      }

      // 2. Initial Layout (Physics will pull them into place)
      const r_pos = Math.sqrt(Math.random()) * 2000;
      const theta = Math.random() * 2 * Math.PI;

      nodes.push({
        id,
        x: r_pos * Math.cos(theta),
        y: r_pos * Math.sin(theta),
        weight: 0, 
        appartenanceId,
        metadata: {},
        visible: true
      });
    }

    // 3. Normalize Weights based on Final Degrees
    let maxDegree = 1;
    for (const key in degrees) {
      if (degrees[key]! > maxDegree) maxDegree = degrees[key]!;
    }
    for (const n of nodes) {
      const degree = degrees[n.id] || 0;
      n.weight = Math.max(0.1, degree / maxDegree);
    }

    loadGraph(nodes, edges);
  };

  const loadGraph = (nodes: any[], edges: any[]) => {
    // Reset store with new data
    const state = store.value;
    const nodeMap: Record<string, any> = {};
    const edgeMap: Record<string, any> = {};
    for(const n of nodes) nodeMap[n.id] = n;
    for(const e of edges) edgeMap[e.id] = e;
    
    store.set({
      ...state,
      nodes: nodeMap,
      edges: edgeMap,
      hoveredNodeId: null,
      selectedNodeId: null
    });
    
    worker.postMessage({ type: 'STOP' });
    worker.postMessage({ type: 'INIT_DATA', payload: { nodes, edges } });
    worker.postMessage({ type: 'START' });
  };

  return {
    store,
    webgl,
    worker,
    loadGraph,
    generateMockData,
    destroy: () => {
      resizeObserver.disconnect();
      webgl.destroy();
      worker.terminate();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  };
}
