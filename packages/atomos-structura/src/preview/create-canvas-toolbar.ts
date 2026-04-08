import { autoLayoutDAG, deserializeDAG, serializeDAG } from '../core/application/dag-service.js';
import type { CanvasViewport } from '../core/create-canvas-viewport.js';
import type { EntityManager } from '../core/presentation/entity-manager.js';
import { getGlobalReduxStore } from '../core/create-redux-store.js';
import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';
import { createCanvasSnapshot } from '../features/export/create-canvas-snapshot.js';
import { getExportPlugins } from '../features/export/create-export-registry.js';

export interface CanvasToolbarConfig {
  readonly viewport: CanvasViewport;
  readonly entityManager: EntityManager;
  readonly onSettings: () => void;
  readonly getKernel: () => SchemaGraphKernel;
  readonly getSnapshot: () => SVGSVGElement;
}

export const createCanvasToolbar = function(config: CanvasToolbarConfig): HTMLElement {
  const { viewport, entityManager } = config;

  const toolbar = document.createElement('div');
  toolbar.style.cssText = [
    'position:absolute;bottom:24px;left:50%;transform:translateX(-50%);',
    'display:flex;align-items:center;gap:8px;z-index:30;',
    'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
    'border:1px solid var(--vbs-border, #27272a);border-radius:12px;padding:6px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);'
  ].join('');

  // Small internal helper for SVG icons
  const createIconButton = (svgContent: string, title: string, onClick: () => void): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.innerHTML = svgContent;
    btn.title = title;
    btn.style.cssText = [
      'display:flex;align-items:center;justify-content:center;',
      'width:36px;height:36px;border:none;background:transparent;',
      'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:pointer;transition:all 0.2s;'
    ].join('');
    btn.onmouseover = () => { btn.style.background = 'var(--vbs-bg-panel, #111111)'; btn.style.color = '#f8fafc'; };
    btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = 'var(--vbs-text-secondary, #a1a1aa)'; };
    btn.onclick = (e) => { e.stopPropagation(); onClick(); };
    btn.onmousedown = (e) => { e.stopPropagation(); };
    return btn;
  };

  const divider = () => {
    const div = document.createElement('div');
    div.style.cssText = 'width:1px;height:24px;background:var(--vbs-border, #27272a);margin:0 4px;';
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

  // -- Export helpers --
  const downloadText = (content: string, filename: string, mime = 'text/plain'): void => {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -- Schema Export Dropdown (plugin-driven) --
  const schemaExportWrap = document.createElement('div');
  schemaExportWrap.style.cssText = 'position:relative;display:flex;';

  const schemaExportBtn = document.createElement('button');
  schemaExportBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
  schemaExportBtn.title = 'Export Schema…';
  schemaExportBtn.style.cssText = [
    'display:flex;align-items:center;justify-content:center;',
    'width:36px;height:36px;border:none;background:transparent;',
    'color:var(--vbs-text-secondary, #a1a1aa);border-radius:var(--vbs-radius, 2px);cursor:pointer;transition:all 0.2s;'
  ].join('');
  schemaExportBtn.onmouseover = () => { schemaExportBtn.style.background = 'var(--vbs-bg-panel, #111111)'; schemaExportBtn.style.color = '#f8fafc'; };
  schemaExportBtn.onmouseout  = () => { schemaExportBtn.style.background = 'transparent'; schemaExportBtn.style.color = 'var(--vbs-text-secondary, #a1a1aa)'; };

  const schemaExportPanel = document.createElement('div');
  schemaExportPanel.style.cssText = [
    'display:none;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);',
    'background:rgba(15,23,42,0.98);backdrop-filter:blur(8px);',
    'border:1px solid #27272a;border-radius:10px;padding:6px;min-width:220px;',
    'box-shadow:0 -10px 15px -3px rgba(0,0,0,0.4);z-index:50;',
  ].join('');

  const buildSchemaExportPanel = (): void => {
    schemaExportPanel.innerHTML = '';
    const header = document.createElement('div');
    header.style.cssText = 'padding:4px 8px 6px;font-size:11px;color:#64748b;font-family:system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #1e293b;margin-bottom:4px;';
    header.textContent = 'Export Schema As…';
    schemaExportPanel.appendChild(header);

    getExportPlugins().forEach(plugin => {
      const row = document.createElement('button');
      row.style.cssText = [
        'display:flex;align-items:center;gap:10px;width:100%;padding:7px 10px;',
        'border:none;background:transparent;color:#cbd5e1;text-align:left;cursor:pointer;border-radius:6px;',
        'font-family:system-ui,sans-serif;font-size:13px;transition:background 0.12s;',
      ].join('');
      row.onmouseover = () => { row.style.background = '#1e293b'; };
      row.onmouseout  = () => { row.style.background = 'transparent'; };
      row.onclick = (e) => {
        e.stopPropagation();
        schemaExportPanel.style.display = 'none';
        const snapshot = config.getKernel().getSnapshot();
        try {
          const content = plugin.generate(snapshot);
          downloadText(content, `schema-${Date.now()}.${plugin.fileExtension}`, plugin.mimeType);
        } catch (err) {
          console.error(`[Export] ${plugin.id} failed:`, err);
        }
      };
      const extBadge = document.createElement('span');
      extBadge.textContent = `.${plugin.fileExtension}`;
      extBadge.style.cssText = 'flex-shrink:0;font-size:10px;font-family:monospace;padding:1px 6px;border-radius:4px;background:#312e81;color:#a5b4fc;';
      const lbl = document.createElement('span');
      lbl.textContent = plugin.label;
      row.appendChild(extBadge);
      row.appendChild(lbl);
      schemaExportPanel.appendChild(row);
    });
  };

  let schemaExportOpen = false;
  schemaExportBtn.onclick = (e) => {
    e.stopPropagation();
    schemaExportOpen = !schemaExportOpen;
    if (schemaExportOpen) {
      buildSchemaExportPanel();
      schemaExportPanel.style.display = 'block';
    } else {
      schemaExportPanel.style.display = 'none';
    }
  };
  document.addEventListener('click', () => {
    schemaExportOpen = false;
    schemaExportPanel.style.display = 'none';
  });

  schemaExportWrap.appendChild(schemaExportBtn);
  schemaExportWrap.appendChild(schemaExportPanel);

  const snapshot = createCanvasSnapshot(config.getSnapshot);

  const exportSvgBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>`,
    'Export SVG',
    () => snapshot.exportSVG()
  );

  const exportPngBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
    'Export PNG',
    () => snapshot.exportPNG()
  );

  // -- Settings --
  const settingsBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    'Settings',
    () => config.onSettings()
  );

  // -- Undo/Redo --
  const store = getGlobalReduxStore();

  const setUndoRedoDisabled = (btn: HTMLButtonElement, disabled: boolean): void => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.3' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  };

  const undoBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 2.83-6.36L3 10"/></svg>`,
    'Undo (Ctrl+Z)',
    () => store.undo()
  );
  const redoBtn = createIconButton(
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-2.83-6.36L21 10"/></svg>`,
    'Redo (Ctrl+Y)',
    () => store.redo()
  );

  const syncUndoRedo = (): void => {
    setUndoRedoDisabled(undoBtn, !store.can_undo());
    setUndoRedoDisabled(redoBtn, !store.can_redo());
  };
  syncUndoRedo();
  store.subscribe(syncUndoRedo);

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
  toolbar.appendChild(schemaExportWrap);
  toolbar.appendChild(exportSvgBtn);
  toolbar.appendChild(exportPngBtn);
  toolbar.appendChild(divider());
  toolbar.appendChild(undoBtn);
  toolbar.appendChild(redoBtn);
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
