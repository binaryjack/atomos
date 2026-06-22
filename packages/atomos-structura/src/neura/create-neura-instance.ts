import { createNeuraStore } from './core/neura-store';
import { WebGLEngine } from './renderer/webgl-engine';
import { CullingSystem } from './renderer/culling-system';

export function createNeuraInstance(canvas: HTMLCanvasElement, workerUrl: string | URL) {
  const { store, setViewport, addNodes, addEdges } = createNeuraStore();
  const webgl = new WebGLEngine(canvas);
  const culling = new CullingSystem(200);
  
  // Initialize Physics Worker
  const worker = new Worker(workerUrl, { type: 'module' });
  
  worker.onmessage = (e) => {
    if (e.data.type === 'TICK_RESULT') {
      const positions = e.data.payload as { id: string, x: number, y: number }[];
      // Update store positions
      store.set(state => {
        const nextNodes = { ...state.nodes };
        for (const pos of positions) {
          if (nextNodes[pos.id]) {
            nextNodes[pos.id] = { ...nextNodes[pos.id], x: pos.x, y: pos.y };
          }
        }
        return { ...state, nodes: nextNodes };
      });
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
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    
    const state = store.get();
    setViewport({ 
      x: state.viewport.x + dx / state.viewport.zoom, 
      y: state.viewport.y + dy / state.viewport.zoom 
    });
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const state = store.get();
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport({ zoom: state.viewport.zoom * zoomDelta });
  });

  // Render loop
  webgl.startLoop(() => {
    const state = store.get();
    
    // 1. Cull off-screen items
    const { visibleNodes, visibleEdges } = culling.cull(state.nodes, state.edges, state.viewport);
    
    // 2. Render visible items
    webgl.render(visibleNodes, visibleEdges, state.viewport);
  });

  // Generate Mock Data for Testing
  const generateMockData = (numNodes: number) => {
    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        id: `n${i}`,
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        weight: Math.random() * 5,
        appartenanceId: `cluster_${Math.floor(Math.random() * 5)}`,
        metadata: {},
        visible: true
      });
    }
    
    const edges = [];
    for (let i = 0; i < numNodes * 1.5; i++) {
      edges.push({
        id: `e${i}`,
        sourceId: `n${Math.floor(Math.random() * numNodes)}`,
        targetId: `n${Math.floor(Math.random() * numNodes)}`,
        weight: Math.random(),
        visible: true
      });
    }

    addNodes(nodes);
    addEdges(edges);
    
    // Send data to physics engine
    worker.postMessage({ type: 'INIT_DATA', payload: { nodes, edges } });
    worker.postMessage({ type: 'START' });
  };

  return {
    store,
    webgl,
    worker,
    generateMockData,
    destroy: () => {
      resizeObserver.disconnect();
      webgl.destroy();
      worker.terminate();
    }
  };
}
