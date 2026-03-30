import { createDAGObserver } from '../core/adapters/dag-observer.js';
import { createCanvasViewport } from '../core/create-canvas-viewport.js';
import { createWorkspaceManager } from '../core/create-workspace-manager.js';
import { getEntityManager } from '../core/presentation/entity-manager.js';
import { createInteractiveEntityDemo } from '../features/entity-with-edges/create-interactive-entity-demo.js';
import { createCanvasToolbar } from './create-canvas-toolbar.js';

export const createCanvasPage = function() {
  const cleanups: Array<() => void> = [];

  // Root — fills full viewport, top offset for the HTML nav bar (40px)
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;top:40px;left:0;right:0;bottom:0;overflow:hidden;background:#0f172a;';

  // Canvas container — full area below nav
  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
  root.appendChild(canvasWrap);

  // SVG — no viewBox, 1 unit = 1 CSS px
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.cssText = 'display:block;cursor:default;';

  // Grid pattern background
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const smallGrid = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  smallGrid.setAttribute('id', 'canvas-grid-small');
  smallGrid.setAttribute('width', '20');
  smallGrid.setAttribute('height', '20');
  smallGrid.setAttribute('patternUnits', 'userSpaceOnUse');
  const smallPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  smallPath.setAttribute('d', 'M 20 0 L 0 0 0 20');
  smallPath.setAttribute('fill', 'none');
  smallPath.setAttribute('stroke', '#1e293b');
  smallPath.setAttribute('stroke-width', '0.5');
  smallGrid.appendChild(smallPath);

  const largeGrid = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  largeGrid.setAttribute('id', 'canvas-grid-large');
  largeGrid.setAttribute('width', '100');
  largeGrid.setAttribute('height', '100');
  largeGrid.setAttribute('patternUnits', 'userSpaceOnUse');
  const largeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  largeRect.setAttribute('width', '100');
  largeRect.setAttribute('height', '100');
  largeRect.setAttribute('fill', 'url(#canvas-grid-small)');
  const largePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  largePath.setAttribute('d', 'M 100 0 L 0 0 0 100');
  largePath.setAttribute('fill', 'none');
  largePath.setAttribute('stroke', '#263348');
  largePath.setAttribute('stroke-width', '1');
  largeGrid.appendChild(largeRect);
  largeGrid.appendChild(largePath);

  defs.appendChild(smallGrid);
  defs.appendChild(largeGrid);
  svg.appendChild(defs);

  // Static grid background rect (outside viewport group, so grid is fixed)
  const gridBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  gridBg.setAttribute('width', '100%');
  gridBg.setAttribute('height', '100%');
  gridBg.setAttribute('fill', 'url(#canvas-grid-large)');
  gridBg.style.pointerEvents = 'none';
  svg.appendChild(gridBg);

  // Viewport group — all world-space content lives here
  const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewportGroup.id = 'vbs-viewport';
  svg.appendChild(viewportGroup);

  canvasWrap.appendChild(svg);

  // Viewport (zoom/pan) — attached to canvasWrap
  const viewport = createCanvasViewport(canvasWrap, svg);
  viewport.state.subscribe(() => {
    viewportGroup.setAttribute('transform', viewport.transform());
  });
  viewportGroup.setAttribute('transform', viewport.transform());
  cleanups.push(viewport.cleanup);

  // Workspace
  const workspace = createWorkspaceManager(svg, viewportGroup);
  cleanups.push(workspace.cleanup.destroy);

  // Phase 5: Shape Palette (Drag & Drop or Click to spawn)
  const palette = document.createElement('div');
  palette.style.cssText = [
    'position:absolute;top:50%;left:16px;transform:translateY(-50%);',
    'display:flex;flex-direction:column;gap:8px;z-index:20;',
    'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
    'border:1px solid #334155;border-radius:12px;padding:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);'
  ].join('');

  const shapes = [
    { type: 'rectangle', icon: '<rect x="4" y="6" width="16" height="12" rx="2"/>' },
    { type: 'cylinder', icon: '<ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v10c0 1.66 3.58 3 8 3s8-1.34 8-3V7"/>' },
    { type: 'actor', icon: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>' },
    { type: 'note', icon: '<path d="M4 4h16v12H8l-4 4V4z"/>' },
    { type: 'diamond', icon: '<polygon points="12 2 22 12 12 22 2 12"/>' }
  ];

  shapes.forEach(sh => {
    const btn = document.createElement('button');
    btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sh.icon}</svg>`;
    btn.title = `Add ${sh.type.charAt(0).toUpperCase() + sh.type.slice(1)}`;
    btn.style.cssText = [
      'display:flex;align-items:center;justify-content:center;',
      'width:40px;height:40px;border:none;background:transparent;',
      'color:#94a3b8;border-radius:8px;cursor:grab;transition:all 0.2s;'
    ].join('');
    
    // Hover fx
    btn.onmouseover = () => { btn.style.background = '#1e293b'; btn.style.color = '#f8fafc'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#94a3b8'; };
    
    // Click to spawn at center
    btn.onclick = () => {
      const v = viewport.state.value;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const worldX = (screenW / 2 - v.pan.x) / v.zoom;
      const worldY = (screenH / 2 - v.pan.y) / v.zoom;
      const id = `entity-${Date.now()}`;
      getEntityManager().createEntity(id, `New ${sh.type}`, { x: worldX - 100, y: worldY - 50 }, { width: 200, height: sh.type === 'rectangle' ? 100 : 180 }, { shape: sh.type });
    };

    // Make it draggable
    btn.draggable = true;
    btn.ondragstart = (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData('application/vbs-shape', sh.type);
        e.dataTransfer.effectAllowed = 'copy';
      }
    };

    palette.appendChild(btn);
  });

  canvasWrap.appendChild(palette);

  // Allow canvas back to receive drops
  canvasWrap.ondragover = (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  
  canvasWrap.ondrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      const shapeType = e.dataTransfer.getData('application/vbs-shape');
      if (shapeType) {
        const v = viewport.state.value;
        const rect = canvasWrap.getBoundingClientRect();
        // Mouse coordinates relative to canvas
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // World coordinates
        const worldX = (mx - v.pan.x) / v.zoom;
        const worldY = (my - v.pan.y) / v.zoom;
        
        const id = `entity-${Date.now()}`;
        getEntityManager().createEntity(id, `New ${shapeType}`, { x: worldX - 100, y: worldY - 50 }, { width: 200, height: shapeType === 'rectangle' ? 100 : 180 }, { shape: shapeType });
      }
    }
  };

  createInteractiveEntityDemo(workspace);

  // Mount Floating Toolbar
  const toolbar = createCanvasToolbar({
    viewport,
    entityManager: getEntityManager()
  });
  canvasWrap.appendChild(toolbar);

  // Phase 4: Output Adapter / Framework Consumer Test
  const outputPanel = document.createElement('div');
  outputPanel.style.cssText = 'position:absolute;bottom:16px;right:16px;width:300px;background:#1e293b;border:1px solid #334155;border-radius:6px;padding:12px;color:#f1f5f9;font-family:monospace;font-size:11px;max-height:200px;overflow-y:auto;z-index:20;box-shadow:0 10px 15px -3px rgba(0,0,0,0.2);';
  
  const outputTitle = document.createElement('div');
  outputTitle.textContent = 'Live Framework DAG Output (Observer)';
  outputTitle.style.cssText = 'font-weight:bold;margin-bottom:8px;color:#38bdf8;';
  outputPanel.appendChild(outputTitle);

  const outputContent = document.createElement('pre');
  outputPanel.appendChild(outputContent);
  canvasWrap.appendChild(outputPanel);

  const dagObserver = createDAGObserver(getEntityManager());
  const unsubscribeObserver = dagObserver.subscribe((dag) => {
    outputContent.textContent = `Nodes: ${dag.nodes.length}\nEdges: ${dag.edges.length}\nLast Updated: ${new Date().toLocaleTimeString()}\n\nRaw DAG Head:\n${JSON.stringify(dag.nodes.slice(0, 1), null, 2)}`;
  });
  cleanups.push(() => {
    unsubscribeObserver();
    dagObserver.cleanup();
  });

  return {
    element: root,
    cleanup: {
      destroy: () => {
        cleanups.forEach(fn => fn());
        cleanups.length = 0;
      }
    }
  };
};
