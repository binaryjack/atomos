import { autoLayoutDAG, deserializeDAG, serializeDAG } from '../core/application/dag-service.js';
import type { CanvasViewport } from '../core/create-canvas-viewport.js';
import type { EntityManager } from '../core/presentation/entity-manager.js';

export interface CanvasToolbarConfig {
  readonly viewport: CanvasViewport;
  readonly entityManager: EntityManager;
}

export const createCanvasToolbar = function(config: CanvasToolbarConfig): HTMLElement {
  const { viewport, entityManager } = config;

  const toolbar = document.createElement('div');
  toolbar.style.cssText = [
    'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);',
    'display:flex;align-items:center;gap:8px;z-index:30;',
    'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
    'border:1px solid #334155;border-radius:12px;padding:6px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);'
  ].join('');

  // Small internal helper for SVG icons
  const createIconButton = (svgContent: string, title: string, onClick: () => void): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.innerHTML = svgContent;
    btn.title = title;
    btn.style.cssText = [
      'display:flex;align-items:center;justify-content:center;',
      'width:36px;height:36px;border:none;background:transparent;',
      'color:#94a3b8;border-radius:8px;cursor:pointer;transition:all 0.2s;'
    ].join('');
    btn.onmouseover = () => { btn.style.background = '#1e293b'; btn.style.color = '#f8fafc'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = '#94a3b8'; };
    btn.onclick = (e) => { e.stopPropagation(); onClick(); };
    btn.onmousedown = (e) => { e.stopPropagation(); };
    return btn;
  };

  const divider = () => {
    const div = document.createElement('div');
    div.style.cssText = 'width:1px;height:24px;background:#334155;margin:0 4px;';
    return div;
  };

  // 1. Math Utils for calculations
  const getBoundingBox = () => {
    const entities = entityManager.getAllEntities();
    if (entities.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(e => {
      minX = Math.min(minX, e.position.x);
      minY = Math.min(minY, e.position.y);
      maxX = Math.max(maxX, e.position.x + e.dimensions.width);
      maxY = Math.max(maxY, e.position.y + e.dimensions.height);
    });
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  };

  const centerToSchema = () => {
    const box = getBoundingBox();
    if (!box) return;
    const { zoom } = viewport.state.value;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 40; // Nav height
    const targetPanX = (screenW / 2) - ((box.minX + box.width / 2) * zoom);
    const targetPanY = (screenH / 2) - ((box.minY + box.height / 2) * zoom);
    viewport.panTo(targetPanX, targetPanY);
  };

  const fitToScreen = () => {
    const box = getBoundingBox();
    if (!box) return;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight - 40;
    const padding = 100;
    const zoomX = (screenW - padding * 2) / Math.max(box.width, 1);
    const zoomY = (screenH - padding * 2) / Math.max(box.height, 1);
    const newZoom = Math.min(Math.min(zoomX, zoomY), 2); // Cap at 2x max
    
    viewport.zoomTo(newZoom);
    
    // Recalculate pan with new zoom
    const targetPanX = (screenW / 2) - ((box.minX + box.width / 2) * newZoom);
    const targetPanY = (screenH / 2) - ((box.minY + box.height / 2) * newZoom);
    viewport.panTo(targetPanX, targetPanY);
  };

  // 2. Build Buttons
  
  // -- File Operations --
  const exportBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    'Export DAG',
    () => {
      const json = serializeDAG(entityManager);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dag-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  );

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json';
  importInput.style.display = 'none';
  importInput.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        deserializeDAG(entityManager, await file.text(), true);
        fitToScreen();
      } catch (err) { alert('Invalid DAG JSON file.'); }
    }
    importInput.value = '';
  };
  const importBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    'Import & Restore Layout',
    () => importInput.click()
  );

  const autoLayoutBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
    'Auto-Layout Nodes',
    () => { autoLayoutDAG(entityManager); centerToSchema(); }
  );

  // -- Viewport Controls --
  const zoomOutBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
    'Zoom Out',
    () => viewport.zoomBy(-0.1)
  );

  const zoomInBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
    'Zoom In',
    () => viewport.zoomBy(0.1)
  );

  const centerBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    'Center to Schema',
    () => centerToSchema()
  );

  const fitBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>`,
    'Fit to Screen',
    () => fitToScreen()
  );

  // -- Settings Link --
  const settingsBtn = document.createElement('a');
  settingsBtn.href = '/test-settings-page.html';
  settingsBtn.target = '_blank';
  settingsBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  settingsBtn.style.cssText = 'color:#94a3b8;cursor:pointer;padding:8px;border-radius:6px;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;text-decoration:none;';
  settingsBtn.title = 'Settings';
  settingsBtn.onmouseover = () => { settingsBtn.style.background = '#1e293b'; settingsBtn.style.color = '#f8fafc'; };
  settingsBtn.onmouseout = () => { settingsBtn.style.background = 'transparent'; settingsBtn.style.color = '#94a3b8'; };
  settingsBtn.onclick = (e) => e.stopPropagation();
  settingsBtn.onmousedown = (e) => e.stopPropagation();

  // -- Zoom Label --
  const zoomLabel = document.createElement('div');
  zoomLabel.style.cssText = 'color:#f8fafc;font-size:12px;font-family:system-ui,sans-serif;min-width:48px;text-align:center;font-variant-numeric:tabular-nums;cursor:pointer;';
  zoomLabel.title = "Reset to 100%";
  zoomLabel.onclick = () => viewport.reset();
  
  viewport.state.subscribe(s => {
    zoomLabel.textContent = `${Math.round(s.zoom * 100)}%`;
  });

  // Assemble
  toolbar.appendChild(importInput);
  toolbar.appendChild(importBtn);
  toolbar.appendChild(exportBtn);
  toolbar.appendChild(autoLayoutBtn);
  toolbar.appendChild(divider());
  toolbar.appendChild(centerBtn);
  toolbar.appendChild(fitBtn);
  toolbar.appendChild(divider());
  toolbar.appendChild(settingsBtn);
  toolbar.appendChild(divider());
  toolbar.appendChild(zoomOutBtn);
  toolbar.appendChild(zoomLabel);
  toolbar.appendChild(zoomInBtn);

  return toolbar;
};
