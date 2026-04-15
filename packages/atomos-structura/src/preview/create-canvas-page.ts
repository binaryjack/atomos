import { getCanvasAdapter } from '../core/adapters/canvas-adapter.js'
import { createDAGObserver } from '../core/adapters/dag-observer.js'
import { getCustomShapes, getGeneralSettings, getToolboxConfig, setCustomShapes, setGeneralSettings, setToolboxConfig, getAppearanceSettings, setAppearanceSettings } from '../core/adapters/toolbox-config-manager.js'
import { applyAppearanceTokens, injectDesignSystemTokens } from '../core/presentation/design-system.js'
import { createCanvasViewport } from '../core/create-canvas-viewport.js'
import { getGlobalReduxStore } from '../core/create-redux-store.js'
import { createWorkspaceManager } from '../core/create-workspace-manager.js'
import { getEntityManager } from '../core/presentation/entity-manager.js'
import { createInteractiveEntityDemo } from '../features/entity-with-edges/create-interactive-entity-demo.js'
import { createSchemaPanel } from '../features/schema-panel/index.js'
import { createSettingsPage } from '../features/settings-page/create-settings-page.js'
import { createCanvasToolbar } from './create-canvas-toolbar.js'
import { createSchemaTabs } from './create-schema-tabs.js'
import { createMinimap } from '../features/minimap/create-minimap.js'
import { createEntitySearch } from '../features/search/create-entity-search.js'
import { createSchemaGraphKernel } from '../core/create-schema-graph-kernel.js'
import { createSchemaValidator } from '../core/validation/create-schema-validator.js'
import { createValidationOverlay } from '../features/validation-overlay/create-validation-overlay.js'
import { copyEntity, pasteEntity } from '../core/clipboard.js'
import { createMcpSync } from '../features/mcp-sync/create-mcp-sync.js'
import { createRubberBand } from '../features/rubber-band/create-rubber-band.js'
import type { WorkspaceConfig } from '@atomos-web/structura-core'
import { createShortcutsPanel } from '../features/shortcuts/create-shortcuts-panel.js'
import { registerExportPlugin } from '../features/export/create-export-registry.js'
import { sqlDdlPlugin } from '../features/export/plugins/sql-ddl.plugin.js'
import { prismaPlugin } from '../features/export/plugins/prisma.plugin.js'
import { typescriptPlugin } from '../features/export/plugins/typescript.plugin.js'
import { jsonSchemaPlugin } from '../features/export/plugins/json-schema.plugin.js'
import { mermaidPlugin } from '../features/export/plugins/mermaid.plugin.js'

// Register built-in export plugins once at module load
registerExportPlugin(sqlDdlPlugin);
registerExportPlugin(prismaPlugin);
registerExportPlugin(typescriptPlugin);
registerExportPlugin(jsonSchemaPlugin);
registerExportPlugin(mermaidPlugin);

export const createCanvasPage = function(config?: WorkspaceConfig, mcpServerUrl?: string) {
  // Seed the global store with the runtime config before any subsystem uses it
  getGlobalReduxStore(config);
  
  // Inject design system CSS variables
  injectDesignSystemTokens();
  
  const cleanups: Array<() => void> = [];

  // Root — fills full viewport
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;overflow:hidden;background:var(--vbs-bg-input, #09090b);';

  // Schema tabs bar
  const schemaTabs = createSchemaTabs();
  root.appendChild(schemaTabs.element);
  cleanups.push(schemaTabs.cleanup.destroy);
  const TAB_H = schemaTabs.height;

  // Canvas container — full area below tab bar
  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = `position:absolute;top:${TAB_H}px;left:0;right:0;bottom:0;overflow:hidden;`;
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
  smallPath.setAttribute('id', 'grid-small-path');
  smallPath.setAttribute('d', 'M 20 0 L 0 0 0 20');
  smallPath.setAttribute('fill', 'none');
  smallPath.setAttribute('stroke', 'var(--vbs-grid-secondary-color, #111111)');
  smallPath.setAttribute('stroke-width', '0.5');
  smallGrid.appendChild(smallPath);

  const largeGrid = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  largeGrid.setAttribute('id', 'canvas-grid-large');
  largeGrid.setAttribute('width', '100');
  largeGrid.setAttribute('height', '100');
  largeGrid.setAttribute('patternUnits', 'userSpaceOnUse');
  const largeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  largeRect.setAttribute('id', 'grid-large-rect');
  largeRect.setAttribute('width', '100');
  largeRect.setAttribute('height', '100');
  largeRect.setAttribute('fill', 'url(#canvas-grid-small)');
  const largePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  largePath.setAttribute('id', 'grid-large-path');
  largePath.setAttribute('d', 'M 100 0 L 0 0 0 100');
  largePath.setAttribute('fill', 'none');
  largePath.setAttribute('stroke', 'var(--vbs-grid-primary-color, #263348)');
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
  cleanups.push(viewport.state.subscribe((vs) => {
    viewportGroup.setAttribute('transform', viewport.transform());
    smallGrid.setAttribute('patternTransform', viewport.transform());
    largeGrid.setAttribute('patternTransform', viewport.transform());
    store.dispatch({ type: 'viewport-updated', viewport: vs });
  }));
  viewportGroup.setAttribute('transform', viewport.transform());
  smallGrid.setAttribute('patternTransform', viewport.transform());
  largeGrid.setAttribute('patternTransform', viewport.transform());
  cleanups.push(viewport.cleanup);

  // Workspace
  const workspace = createWorkspaceManager(svg, viewportGroup);
  cleanups.push(workspace.cleanup.destroy);

  // Apply persisted appearance tokens AFTER design system is injected
  const savedAppearance = getAppearanceSettings();
  if (savedAppearance) {
    applyAppearanceTokens(savedAppearance.entity, savedAppearance.link);
  }

  // Phase 5: Shape Palette (Drag & Drop or Click to spawn)
  const palette = document.createElement('div');
  palette.style.cssText = [
    'position:absolute;top:50%;left:16px;transform:translateY(-50%);',
    'display:flex;flex-direction:column;gap:8px;z-index:20;',
    'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
    'border:1px solid var(--vbs-border, #27272a);border-radius:12px;padding:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);'
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
        'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:grab;transition:all 0.2s;'
      ].join('');
      
      btn.onmouseover = () => { btn.style.background = 'var(--vbs-bg-panel, #111111)'; btn.style.color = '#f8fafc'; };
      btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = 'var(--vbs-text-secondary, #a1a1aa)'; };
      
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
        'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:pointer;transition:all 0.2s;'
      ].join('');
      
      groupBtn.onmouseover = () => { groupBtn.style.background = 'var(--vbs-bg-panel, #111111)'; groupBtn.style.color = '#f8fafc'; };
      groupBtn.onmouseout = () => { groupBtn.style.background = 'transparent'; groupBtn.style.color = 'var(--vbs-text-secondary, #a1a1aa)'; };

      const flyout = document.createElement('div');
      flyout.style.cssText = [
        'display:none;position:absolute;left:100%;top:0;margin-left:8px;',
        'background:rgba(15,23,42,0.95);backdrop-filter:blur(8px);',
        'border:1px solid var(--vbs-border, #27272a);border-radius:12px;padding:8px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.3);',
        'flex-direction:row;gap:8px;z-index:30;'
      ].join('');

      toolset.tools.forEach((sh) => {
        const btn = document.createElement('button');
        btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${sh.icon}</svg>`;
        btn.title = sh.description || `Add ${sh.name}`;
        btn.style.cssText = [
          'display:flex;align-items:center;justify-content:center;',
          'width:40px;height:40px;border:none;background:transparent;',
          'color:var(--vbs-text-secondary, #a1a1aa);border-radius: var(--vbs-radius, 2px);cursor:grab;transition:all 0.2s;'
        ].join('');
        
        btn.onmouseover = () => { btn.style.background = 'var(--vbs-border, #27272a)'; btn.style.color = '#f8fafc'; };
        btn.onmouseout = () => { btn.style.background = 'transparent'; btn.style.color = 'var(--vbs-text-secondary, #a1a1aa)'; };
        
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

  // Minimap — anchored to the right edge of the shape palette
  const minimap = createMinimap(getEntityManager(), viewport, canvasWrap, palette);
  cleanups.push(minimap.cleanup.destroy);

  // Entity search (Ctrl+K)
  const entitySearch = createEntitySearch(getEntityManager(), viewport, canvasWrap);
  cleanups.push(entitySearch.cleanup.destroy);

  // Mount Floating Toolbar
  const { bottomBar, topBurger, destroy: destroyToolbar } = createCanvasToolbar({
    viewport,
    entityManager: getEntityManager(),
    onSettings: () => {
      if (config?.headless) return;
      const store = getGlobalReduxStore();
      const st = store.get_state();
      store.dispatch({ type: 'settings-toggled', is_open: !st.is_settings_open });
    },
    getKernel: () => {
      const reduxStore = getGlobalReduxStore();
      const st = reduxStore.get_state();
      const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
      const schema = canvas?.schemas[canvas?.active_schema_id ?? ''];
      const entities = Object.fromEntries((schema?.entities ?? []).map(e => [e.id, e]));
      const links = Object.fromEntries((schema?.links ?? []).map(l => [l.id, l]));
      return createSchemaGraphKernel({ entities, links });
    },
    getSnapshot: () => canvasWrap.querySelector('svg') as SVGSVGElement,
  });
  cleanups.push(destroyToolbar);
  canvasWrap.appendChild(bottomBar);
  
  // Inject topBurger before schemaTabs element
  schemaTabs.element.insertBefore(topBurger, schemaTabs.element.firstChild);
  // Add margin to make sure it doesn't stick to the edge
  topBurger.style.marginLeft = '8px';

  // Validation overlay
  const store = getGlobalReduxStore();
  const validator = createSchemaValidator(store);
  const validationOverlay = createValidationOverlay(validator, viewport, getEntityManager(), canvasWrap);
  cleanups.push(validationOverlay.cleanup.destroy);
  cleanups.push(validator.cleanup);

  // Rubber-band multi-select
  const rubberBand = createRubberBand(svg, viewportGroup, viewport, getEntityManager());
  cleanups.push(rubberBand.cleanup.destroy);
  // Visual selection feedback — highlight matched entities with a blue glow
  cleanups.push(rubberBand.subscribe(ids => {
    workspace.workspaceState.value.entities.forEach((instance, entityId) => {
      (instance.element as SVGElement).style.filter = ids.has(entityId)
        ? 'drop-shadow(0 0 6px #3b82f6)'
        : '';
    });
  }));

  // Shortcuts panel
  const shortcutsPanel = createShortcutsPanel();
  cleanups.push(shortcutsPanel.cleanup.destroy);

  // MCP live sync (silent if server is not running)
  try {
    const mcpSync = createMcpSync(store, mcpServerUrl);
    cleanups.push(mcpSync.cleanup);
  } catch { /* noop */ }

  // Canvas reconciliation — syncs the DOM when undo/redo changes Redux state
  // without going through entity-manager commands (which would pollute history).
  let reconciling = false;
  const runReconcile = (state: ReturnType<typeof store.get_state>): void => {
    if (reconciling) return;
    reconciling = true;
    try {
      const canvas = state.workspace.canvases[state.workspace.active_canvas_id];
      const schema = canvas?.schemas[canvas?.active_schema_id ?? ''];
      const reduxEntities = schema?.entities ?? [];
      const reduxEntityMap = new Map(reduxEntities.map(e => [e.id, e]));
      const domEntities = workspace.workspaceState.value.entities;

      // 1. Remove DOM entities that are no longer in the active Redux schema.
      //    Temporarily suppress onEntityDeleted / onLinkDeleted so this DOM-only
      //    cleanup never cascades into Redux deletions (which would corrupt data on tab switch).
      const savedOnEntityDeleted = (workspace as any).onEntityDeleted as ((id: string) => void) | null;
      const savedOnLinkDeleted = (workspace as any).onLinkDeleted as ((id: string) => void) | null;
      (workspace as any).onEntityDeleted = null;
      (workspace as any).onLinkDeleted = null;
      try {
        domEntities.forEach((_, id) => {
          if (!reduxEntityMap.has(id)) workspace.unregisterEntity(id);
        });
      } finally {
        (workspace as any).onEntityDeleted = savedOnEntityDeleted;
        (workspace as any).onLinkDeleted = savedOnLinkDeleted;
      }

      // 2. Update positions / dimensions for existing entities directly on signals
      //    posSignal subscribers will see Redux-match and skip write-back
      reduxEntities.forEach(re => {
        const inst = workspace.workspaceState.value.entities.get(re.id);
        if (!inst) return;
        const cur = inst.position.value;
        if (Math.abs(cur.x - re.position.x) > 0.5 || Math.abs(cur.y - re.position.y) > 0.5) {
          inst.position.set({ x: re.position.x, y: re.position.y });
        }
        const curD = inst.dimensions.value;
        if (Math.abs(curD.width - re.dimensions.width) > 0.5 || Math.abs(curD.height - re.dimensions.height) > 0.5) {
          inst.dimensions.set({ width: re.dimensions.width, height: re.dimensions.height });
        }
      });

      // 1.5. Remove DOM link paths that no longer belong to the active schema.
      //      Entity cascade cleanup (step 1) removes links via their entity endpoints,
      //      but any orphaned paths are caught here as an explicit safety net.
      const reduxLinks = schema?.links ?? [];
      const activeLinkIdSet = new Set(reduxLinks.map(l => l.id));
      const staleLinkIds: string[] = [];
      workspace.linkManager.links.value.forEach((_, linkId) => {
        if (!activeLinkIdSet.has(linkId)) staleLinkIds.push(linkId);
      });
      staleLinkIds.forEach(linkId => workspace.removeLinkById(linkId, true));

      // 3. Re-announce entities that are in Redux but missing from DOM.
      //    Uses reannounceEntity to fire EntityCreated without any Redux write,
      //    avoiding data corruption (no overwriting properties with empty values).
      const missing = reduxEntities.filter(re => !workspace.workspaceState.value.entities.has(re.id));
      missing.forEach(re => getEntityManager().reannounceEntity(re.id));

      // 4. Re-announce links that are in Redux but missing from DOM (tab switch / undo).
      const missingLinks = reduxLinks.filter(rl => {
        const domLink = workspace.linkManager.getLink(rl.id);
        if (!domLink) return true;
        // If anchor IDs changed via Optimize Connections or Undo/Redo,
        // the DOM link exists but points to stale anchors. Re-create it!
        if (domLink.sourceAnchorId !== rl.leftAnchorId || domLink.targetAnchorId !== rl.rightAnchorId) {
          const savedOnLinkDeleted = (workspace as any).onLinkDeleted;
          (workspace as any).onLinkDeleted = null; // suppress cascading deletions
          workspace.removeLinkById(rl.id, true);
          (workspace as any).onLinkDeleted = savedOnLinkDeleted;
          return true;
        }
        return false;
      });
      missingLinks.forEach(rl => getEntityManager().reannounceLink(rl.id));

      // 5. Always refresh the minimap after reconcile so switching to an empty
      //    schema clears stale thumbnails (no EntityCreated events fire otherwise).
      minimap.refresh();
    } finally {
      reconciling = false;
    }
  };
  let prevCanvasId = store.get_state().workspace.active_canvas_id;

  const unsubReconcile = store.subscribe((state) => {
    const canvasId = state.workspace.active_canvas_id;
    if (canvasId !== prevCanvasId) {
      prevCanvasId = canvasId;
      const newCanvas = state.workspace.canvases[canvasId];
      if (newCanvas) {
        viewport.panTo(newCanvas.viewport.pan.x, newCanvas.viewport.pan.y);
        viewport.zoomTo(newCanvas.viewport.zoom);
        const appearance = newCanvas.appearance_override ?? getAppearanceSettings();
        applyAppearanceTokens(appearance?.entity, appearance?.link);
      }
    }
    runReconcile(state);
  });
  // Trigger immediately so persisted entities/links appear on page load without
  // requiring a Redux dispatch (the store does not fire subscribers on the initial load).
  runReconcile(store.get_state());
  cleanups.push(unsubReconcile);

  let currentSettingsPage: { element: HTMLElement; cleanup: { destroy: () => void } } | null = null;

  const applyGridSettings = () => {
    const general = getGeneralSettings();
    if (general) {
      if (general.canvasBackgroundColor) {
        root.style.backgroundColor = general.canvasBackgroundColor;
      }
      if (general.gridPrimaryColor) {
        root.style.setProperty('--vbs-grid-primary-color', general.gridPrimaryColor);
        // Also update the static svg grid paths if they rely on it
        const largePath = document.getElementById('grid-large-path');
        if (largePath) largePath.setAttribute('stroke', general.gridPrimaryColor);
      }
      if (general.gridSecondaryColor) {
        root.style.setProperty('--vbs-grid-secondary-color', general.gridSecondaryColor);
        const smallPath = document.getElementById('grid-small-path');
        if (smallPath) smallPath.setAttribute('stroke', general.gridSecondaryColor);
      }
      if (general.gridSize) {
        const largeGrid = document.getElementById('canvas-grid-large');
        const smallGrid = document.getElementById('canvas-grid-small');
        const largeRect = document.getElementById('grid-large-rect');
        const smallPath = document.getElementById('grid-small-path');
        const largePath = document.getElementById('grid-large-path');
        
        if (largeGrid && smallGrid && largeRect && smallPath && largePath) {
          smallGrid.setAttribute('width', general.gridSize.toString());
          smallGrid.setAttribute('height', general.gridSize.toString());
          smallPath.setAttribute('d', `M ${general.gridSize} 0 L 0 0 0 ${general.gridSize}`);
          
          const largeSize = general.gridSize * 5;
          largeGrid.setAttribute('width', largeSize.toString());
          largeGrid.setAttribute('height', largeSize.toString());
          largeRect.setAttribute('width', largeSize.toString());
          largeRect.setAttribute('height', largeSize.toString());
          largePath.setAttribute('d', `M ${largeSize} 0 L 0 0 0 ${largeSize}`);
        }
      }
    }
  };

  const unsubSettings = store.subscribe(() => {
    const st = store.get_state();
    if (st.is_settings_open && !currentSettingsPage) {
      currentSettingsPage = createSettingsPage({
        initialSettings: { toolbox: getToolboxConfig(), shapes: getCustomShapes(), general: getGeneralSettings() || {}, appearance: getAppearanceSettings() || {} },
        getKernel: () => {
          const reduxSt = store.get_state();
          const activeCanvas = reduxSt.workspace.canvases[reduxSt.workspace.active_canvas_id];
          const activeSchema = activeCanvas?.schemas[activeCanvas?.active_schema_id ?? ''];
          const entities = Object.fromEntries((activeSchema?.entities ?? []).map(e => [e.id, e]));
          const links = Object.fromEntries((activeSchema?.links ?? []).map(l => [l.id, l]));
          return createSchemaGraphKernel({ entities, links });
        },
        onClose: () => {
          store.dispatch({ type: 'settings-toggled', is_open: false });
        },
        onSave: (settings) => {
          setToolboxConfig(settings.toolbox);
          setCustomShapes(settings.shapes);
          setGeneralSettings(settings.general);
          setAppearanceSettings(settings.appearance);
          applyAppearanceTokens(settings.appearance?.entity, settings.appearance?.link);
          applyGridSettings();
          
          const adapter = getCanvasAdapter();
          const allLinks = adapter.getAllLinks() || [];
          allLinks.forEach((link: any) => {
            if (!link.renderType || link.renderType === 'bezier' || link.renderType === 'orthogonal' || link.renderType === 'linear') {
              if (settings.general?.defaultLinkStyle) {
                adapter.updateLinkProperties(link.id, {
                  renderType: settings.general.defaultLinkStyle
                });
              }
            }
          });
          
          store.dispatch({ type: 'settings-toggled', is_open: false });
        },
      });
      root.appendChild(currentSettingsPage.element);
    } else if (!st.is_settings_open && currentSettingsPage) {
      currentSettingsPage.element.remove();
      currentSettingsPage.cleanup.destroy();
      currentSettingsPage = null;
    }
  });

  // apply settings at startup
  applyGridSettings();

  // initial check
  const initSt = store.get_state();
  if (initSt.is_settings_open) {
    store.dispatch({ type: 'settings-toggled', is_open: true }); // force re-render
  }

  cleanups.push(() => {
    unsubSettings();
    if (currentSettingsPage) {
      currentSettingsPage.element.remove();
      currentSettingsPage.cleanup.destroy();
    }
  });

  // Keyboard shortcuts: Undo, Redo, Search, Copy/Paste, Delete, Shortcuts panel
  const onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement;
    const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as HTMLElement).isContentEditable;
    if (isEditing) return;

    if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      store.undo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
      e.preventDefault();
      store.redo();
    } else if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      entitySearch.open();
    } else if (e.ctrlKey && e.key === 'c') {
      // Copy: prefer multi-select first entity, else selected entity
      const multiIds = rubberBand.getSelectedIds();
      const entityId = multiIds.size > 0
        ? multiIds.values().next().value as string
        : (getCanvasAdapter().getSelectedEntityId() ?? undefined);
      if (entityId) {
        const entity = getEntityManager().getEntity(entityId);
        if (entity) copyEntity(entity);
      }
    } else if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      pasteEntity(getEntityManager());
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const multiIds = rubberBand.getSelectedIds();
      if (multiIds.size > 0) {
        e.preventDefault();
        const count = multiIds.size;
        if (count === 1 || window.confirm(`Delete ${count} entities?`)) {
          multiIds.forEach(id => getEntityManager().removeEntity(id));
        }
      } else {
        const selectedId = getCanvasAdapter().getSelectedEntityId();
        if (selectedId) {
          e.preventDefault();
          getEntityManager().removeEntity(selectedId);
        }
      }
    } else if (e.shiftKey && e.key === '?') {
      e.preventDefault();
      shortcutsPanel.open();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  cleanups.push(() => document.removeEventListener('keydown', onKeyDown));

  // ── Schema Panel (right side, collapsible treeview) ──────────────────────
  if (!config?.headless) {
  const dagObserver = createDAGObserver(getEntityManager());

  const schemaPanel = createSchemaPanel({
    dagObserver,
    viewport,
    behaviorManager: workspace.behaviorManager,
    canvasContainer: canvasWrap,
  });

  // Append to root so it floats over the canvas on the right side
  root.appendChild(schemaPanel.element);
  // Push panel below the tab bar
  schemaPanel.element.style.top = `${TAB_H}px`;

  cleanups.push(() => {
    schemaPanel.cleanup.destroy();
    dagObserver.cleanup();
  });
  }

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
