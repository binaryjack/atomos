import { createCanvasViewport } from '../core/create-canvas-viewport.js';
import { createWorkspaceManager } from '../core/create-workspace-manager.js';
import { createInteractiveEntityDemo } from '../features/entity-with-edges/create-interactive-entity-demo.js';

import { autoLayoutDAG, deserializeDAG, serializeDAG } from '../core/application/dag-service.js';
import { getEntityManager } from '../core/presentation/entity-manager.js';
import { createDAGObserver } from '../core/adapters/dag-observer.js';

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

  createInteractiveEntityDemo(workspace);

  // Zoom indicator
  const zoomLabel = document.createElement('div');
  zoomLabel.style.cssText = [
    'position:absolute;bottom:16px;right:16px;',
    'background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);',
    'border:1px solid #1e293b;border-radius:6px;',
    'padding:4px 10px;color:#94a3b8;font-size:11px;font-family:system-ui,sans-serif;',
    'pointer-events:none;z-index:10;',
  ].join('');
  zoomLabel.textContent = '100%';
  viewport.state.subscribe(s => {
    zoomLabel.textContent = `${Math.round(s.zoom * 100)}%`;
  });
  canvasWrap.appendChild(zoomLabel);

  // Tools Panel (DAG Tools)
  const floatMenu = document.createElement('div');
  floatMenu.style.cssText = [
    'position:absolute;top:16px;right:16px;',
    'display:flex;gap:8px;z-index:20;'
  ].join('');

  const btnStyle = 'background:#1e293b;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;font-family:system-ui,sans-serif;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);';

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export DAG';
  exportBtn.style.cssText = btnStyle;
  exportBtn.onclick = () => {
    const json = serializeDAG(getEntityManager());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dag-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json';
  importInput.style.display = 'none';
  importInput.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const text = await file.text();
      try {
        deserializeDAG(getEntityManager(), text, true);
        importInput.value = ''; // Reset
      } catch (err) {
        alert('Invalid DAG JSON file.');
      }
    }
  };

  const importBtn = document.createElement('button');
  importBtn.textContent = 'Import/Restore Layout';
  importBtn.style.cssText = btnStyle;
  importBtn.onclick = () => importInput.click();

  const autoLayoutBtn = document.createElement('button');
  autoLayoutBtn.textContent = 'Auto-Layout Nodes';
  autoLayoutBtn.style.cssText = btnStyle;
  autoLayoutBtn.onclick = () => {
    autoLayoutDAG(getEntityManager());
  };

  floatMenu.appendChild(exportBtn);
  floatMenu.appendChild(importInput);
  floatMenu.appendChild(importBtn);
  floatMenu.appendChild(autoLayoutBtn);
  canvasWrap.appendChild(floatMenu);

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
