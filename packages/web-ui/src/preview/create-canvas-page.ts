import { createDAGObserver } from '../core/adapters/dag-observer.js';
import { getToolboxConfig } from '../core/adapters/toolbox-config-manager.js';
import { createCanvasViewport } from '../core/create-canvas-viewport.js';
import { createWorkspaceManager } from '../core/create-workspace-manager.js';
import { getEntityManager } from '../core/presentation/entity-manager.js';
import { createInteractiveEntityDemo } from '../features/entity-with-edges/create-interactive-entity-demo.js';
import { createSchemaPanel } from '../features/schema-panel/index.js';
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

  const toolboxConfig = getToolboxConfig();

  toolboxConfig.toolsets.forEach((toolset) => {
    // Container for the tool or toolset
    const setContainer = document.createElement('div');
    setContainer.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;';

    if (toolset.tools.length === 1) {
      // Just a single tool, act as normal button
      const sh = toolset.tools[0];
      if (!sh) return;
      const btn = document.createElement('button');
      btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sh.icon}</svg>`;
      btn.title = sh.description || `Add ${sh.name}`;
      btn.style.cssText = [
        'display:flex;align-items:center;justify-content:center;',
        'width:40px;height:40px;border:none;background:transparent;',
        'color:#94a3b8;border-radius:8px;cursor:grab;transition:all 0.2s;'
      ].join('');
      
      btn.onmouseover = () => { btn.style.background = '#1e293b'; btn.style.color = '#f8fafc'; };
      btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#94a3b8'; };
      
      btn.onclick = () => {
        const v = viewport.state.value;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const worldX = (screenW / 2 - v.pan.x) / v.zoom;
        const worldY = (screenH / 2 - v.pan.y) / v.zoom;
        const id = `entity-${Date.now()}`;
        getEntityManager().createEntity(id, `New ${sh.name}`, { x: worldX - 100, y: worldY - 50 }, { width: 200, height: sh.shape === 'box' || sh.shape === 'rectangle' ? 100 : 180 }, { shape: sh.shape, color: sh.baseColor });
      };

      btn.draggable = true;
      btn.ondragstart = (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData('application/vbs-shape', sh.shape);
          e.dataTransfer.setData('application/vbs-color', sh.baseColor);
          e.dataTransfer.effectAllowed = 'copy';
        }
      };

      setContainer.appendChild(btn);
    } else if (toolset.tools.length > 1) {
      // Render group icon with a flyout
      const groupBtn = document.createElement('button');
      groupBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${toolset.icon}</svg>
        <div style="position:absolute;bottom:2px;right:2px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:4px solid #64748b;transform:rotate(135deg);"></div>
      `;
      groupBtn.title = toolset.name;
      groupBtn.style.cssText = [
        'position:relative;display:flex;align-items:center;justify-content:center;',
        'width:40px;height:40px;border:none;background:transparent;',
        'color:#94a3b8;border-radius:8px;cursor:pointer;transition:all 0.2s;'
      ].join('');
      
      groupBtn.onmouseover = () => { groupBtn.style.background = '#1e293b'; groupBtn.style.color = '#f8fafc'; };
      groupBtn.onmouseout = () => { groupBtn.style.background = 'transparent'; groupBtn.style.color = '#94a3b8'; };

      const flyout = document.createElement('div');
      flyout.style.cssText = [
        'display:none;position:absolute;left:100%;top:0;margin-left:8px;',
        'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
        'border:1px solid #334155;border-radius:12px;padding:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);',
        'flex-direction:row;gap:8px;z-index:30;'
      ].join('');

      toolset.tools.forEach((sh) => {
        const btn = document.createElement('button');
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sh.icon}</svg>`;
        btn.title = sh.description || `Add ${sh.name}`;
        btn.style.cssText = [
          'display:flex;align-items:center;justify-content:center;',
          'width:40px;height:40px;border:none;background:transparent;',
          'color:#94a3b8;border-radius:8px;cursor:grab;transition:all 0.2s;'
        ].join('');
        
        btn.onmouseover = () => { btn.style.background = '#334155'; btn.style.color = '#f8fafc'; };
        btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#94a3b8'; };
        
        btn.onclick = (e) => {
          e.stopPropagation();
          const v = viewport.state.value;
          const screenW = window.innerWidth;
          const screenH = window.innerHeight;
          const worldX = (screenW / 2 - v.pan.x) / v.zoom;
          const worldY = (screenH / 2 - v.pan.y) / v.zoom;
          const id = `entity-${Date.now()}`;
          getEntityManager().createEntity(id, `New ${sh.name}`, { x: worldX - 100, y: worldY - 50 }, { width: 200, height: sh.shape === 'box' || sh.shape === 'rectangle' ? 100 : 180 }, { shape: sh.shape, color: sh.baseColor });
          flyout.style.display = 'none';
        };

        btn.draggable = true;
        btn.ondragstart = (e) => {
          if (e.dataTransfer) {
            e.dataTransfer.setData('application/vbs-shape', sh.shape);
            e.dataTransfer.setData('application/vbs-color', sh.baseColor);
            e.dataTransfer.effectAllowed = 'copy';
          }
        };
        flyout.appendChild(btn);
      });

      // Show flyout on hover or click
      let hideTimeout: any;
      setContainer.onmouseenter = () => {
        clearTimeout(hideTimeout);
        flyout.style.display = 'flex';
      };
      setContainer.onmouseleave = () => {
        hideTimeout = setTimeout(() => {
          flyout.style.display = 'none';
        }, 300);
      };

      setContainer.appendChild(groupBtn);
      setContainer.appendChild(flyout);
    }
    
    palette.appendChild(setContainer);
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
      const shapeColor = e.dataTransfer.getData('application/vbs-color');
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
        const metadata: any = { shape: shapeType };
        if (shapeColor) metadata.color = shapeColor;
        
        getEntityManager().createEntity(id, `New ${shapeType}`, { x: worldX - 100, y: worldY - 50 }, { width: 200, height: shapeType === 'box' || shapeType === 'rectangle' ? 100 : 180 }, metadata);
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

  // ── Schema Panel (right side, collapsible treeview) ──────────────────────
  const dagObserver = createDAGObserver(getEntityManager());

  const schemaPanel = createSchemaPanel({
    dagObserver,
    viewport,
    behaviorManager: workspace.behaviorManager,
    canvasContainer: canvasWrap,
  });

  // Append to root so it floats over the canvas on the right side
  root.appendChild(schemaPanel.element);

  cleanups.push(() => {
    schemaPanel.cleanup.destroy();
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
