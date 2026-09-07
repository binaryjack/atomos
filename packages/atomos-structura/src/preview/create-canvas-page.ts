import { renderToSVG } from '@atomos-web/renderer-svg';
import type { WorkspaceConfig } from '@atomos-web/structura-core';
import { getCanvasAdapter } from '../core/adapters/canvas-adapter.js';
import { createDAGObserver } from '../core/adapters/dag-observer.js';
import { getAppearanceSettings, getCustomShapes, getGeneralSettings, getToolboxConfig, initToolboxConfigManager, setAppearanceSettings, setCustomShapes, setGeneralSettings, setToolboxConfig } from '../core/adapters/toolbox-config-manager.js';
import { copyEntity, pasteEntity } from '../core/clipboard.js';
import { createCanvasViewport } from '../core/create-canvas-viewport.js';
import { createInstanceReduxStore } from '../core/create-redux-store.js';
import { createSchemaGraphKernel } from '../core/create-schema-graph-kernel.js';
import { createWorkspaceManager } from '../core/create-workspace-manager.js';
import { applyAppearanceTokens, injectDesignSystemTokens } from '../core/presentation/design-system.js';
import { getEntityManager } from '../core/presentation/entity-manager.js';
import { createSchemaValidator } from '../core/validation/create-schema-validator.js';
import { createInteractiveEntityDemo } from '../features/entity-with-edges/create-interactive-entity-demo.js';
import { initExportRegistry, registerExportPlugin } from '../features/export/create-export-registry.js';
import { jsonSchemaPlugin } from '../features/export/plugins/json-schema.plugin.js';
import { mermaidPlugin } from '../features/export/plugins/mermaid.plugin.js';
import { prismaPlugin } from '../features/export/plugins/prisma.plugin.js';
import { sqlDdlPlugin } from '../features/export/plugins/sql-ddl.plugin.js';
import { typescriptPlugin } from '../features/export/plugins/typescript.plugin.js';
import { createMcpSync, mcpEventTarget } from '../features/mcp-sync/create-mcp-sync.js';
import { createBreadcrumb } from '../features/meta-canvas/create-breadcrumb.js';
import { createGroupPalette } from '../features/meta-canvas/create-group-palette.js';
import { createMinimap } from '../features/minimap/create-minimap.js';
import { createRubberBand } from '../features/rubber-band/create-rubber-band.js';
import { createSchemaPanel } from '../features/schema-panel/index.js';
import { createEntitySearch } from '../features/search/create-entity-search.js';
import { createSettingsPage } from '../features/settings-page/create-settings-page.js';
import { createShortcutsPanel } from '../features/shortcuts/create-shortcuts-panel.js';
import { createValidationOverlay } from '../features/validation-overlay/create-validation-overlay.js';
import { createGridBackground } from './components/create-grid-background.js';
import { injectCanvasResponsiveStyles } from './components/create-canvas-styles.js';
import { createShapePalette } from './components/create-shape-palette.js';
import { createCanvasToolbar } from './create-canvas-toolbar.js';
import { createSchemaTabs } from './create-schema-tabs.js';

// @ts-ignore - Vite will resolve this
import primeStyleContent from '@atomos-web/prime-style/dist/styles.css?raw';

// Register built-in export plugins once at module load
registerExportPlugin(sqlDdlPlugin);
registerExportPlugin(prismaPlugin);
registerExportPlugin(typescriptPlugin);
registerExportPlugin(jsonSchemaPlugin);
registerExportPlugin(mermaidPlugin);

export const createCanvasPage = function (
  instanceId: string,
  config?: WorkspaceConfig,
  mcpServerUrl?: string,
  onStateChange?: (state: any) => void
) {
  if (!instanceId || instanceId.trim().length === 0) {
    throw new Error(
      'createCanvasPage(instanceId, config?, mcpServerUrl?) requires a non-empty instanceId. ' +
        'v2.0.0 breaks backward compatibility: instanceId is now mandatory.'
    );
  }

  // Initialize per-instance storage managers
  initToolboxConfigManager(instanceId);
  initExportRegistry(instanceId);

  // Seed the per-instance Redux store
  const store = createInstanceReduxStore(config, instanceId);
  const cleanups: Array<() => void> = [];

  if (onStateChange) {
    cleanups.push(
      store.subscribe(() => {
        onStateChange(store.get_state());
      })
    );
  }

  // Inject design system CSS tokens
  injectDesignSystemTokens();

  // Host element for Shadow DOM
  const host = document.createElement('div');
  host.setAttribute('data-testid', 'structura-canvas-root');
  host.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';

  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Inject Prime Style CSS into Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = primeStyleContent;
  shadowRoot.appendChild(styleEl);

  // Root container inside Shadow DOM
  const root = document.createElement('div');
  root.style.cssText =
    'position:relative;width:100%;height:100%;overflow:hidden;background:var(--vbs-bg-input, #09090b);display:flex;flex-direction:column;';
  shadowRoot.appendChild(root);

  // Schema tabs bar
  let schemaTabs: any = null;
  if (config?.allow_multiple_schemas !== false && !config?.headless) {
    schemaTabs = createSchemaTabs(instanceId);
    root.appendChild(schemaTabs.element);
    cleanups.push(schemaTabs.cleanup.destroy);
  }

  // Meta Canvas Breadcrumb
  const breadcrumb = createBreadcrumb(root, store);
  cleanups.push(breadcrumb.destroy);

  // Main Canvas Area
  const mainArea = document.createElement('div');
  mainArea.style.cssText = 'position:relative;flex:1;display:flex;flex-direction:row;min-height:0;min-width:0;overflow:hidden;';
  root.appendChild(mainArea);

  // Meta Canvas Group Palette
  const groupPalette = createGroupPalette(mainArea, store);
  cleanups.push(groupPalette.destroy);

  const canvasWrap = document.createElement('div');
  canvasWrap.classList.add('vbs-canvas-wrap');
  canvasWrap.style.cssText =
    'position:relative;flex:1;min-width:0;min-height:0;overflow:hidden;background-color:var(--vbs-bg-canvas, #020617);-webkit-backface-visibility:hidden;backface-visibility:hidden;';
  mainArea.appendChild(canvasWrap);

  // SVG Canvas Stage
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('data-testid', 'structura-canvas-svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.cssText = 'display:block;cursor:default;-webkit-transform:translateZ(0);transform:translateZ(0);';

  // Sub-component: Grid background
  const shouldHideGrid = Boolean(
    config?.headless ||
    (config as any)?.hide_grid ||
    (config as any)?.hideGrid ||
    config?.readonly ||
    ((config as any)?.mode === 'readonly')
  );
  createGridBackground(svg, { hidden: shouldHideGrid });

  // Viewport group
  const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewportGroup.id = 'vbs-viewport';
  svg.appendChild(viewportGroup);
  canvasWrap.appendChild(svg);

  // Initialize Viewport with Redux state
  const initialCanvasState = store.get_state().workspace.canvases[store.get_state().workspace.active_canvas_id];
  let initialViewport = initialCanvasState?.viewport;

  if (initialViewport && !(initialViewport as any).pan && typeof (initialViewport as any).panX === 'number') {
    initialViewport = {
      zoom: Number.isFinite(initialViewport.zoom) ? initialViewport.zoom : 1,
      pan: {
        x: (initialViewport as any).panX,
        y: (initialViewport as any).panY
      }
    };
    setTimeout(() => store.dispatch({ type: 'viewport-updated', viewport: initialViewport as any }), 0);
  } else if (!initialViewport || !initialViewport.pan || !Number.isFinite(initialViewport.pan.x)) {
    initialViewport = { zoom: 1, pan: { x: 0, y: 0 } };
  }

  const viewport = createCanvasViewport(canvasWrap, svg, initialViewport as any, vs => {
    store.dispatch({ type: 'viewport-updated', viewport: vs });
  });

  const applyViewport = () => {
    const t = viewport.transform();
    viewportGroup.setAttribute('transform', t);

    // Rétablissement du suivi de la grille (cassé lors du refactoring du 23 Juillet)
    const smallGrid = svg.querySelector('#canvas-grid-small');
    const largeGrid = svg.querySelector('#canvas-grid-large');
    if (smallGrid) smallGrid.setAttribute('patternTransform', t);
    if (largeGrid) largeGrid.setAttribute('patternTransform', t);
  };

  console.log("viewport", viewport);
  cleanups.push(viewport.state.subscribe(applyViewport));
  applyViewport();
  cleanups.push(viewport.cleanup);

  let isSmallCanvas = false;
  const isReadonly = () => {
    return isSmallCanvas || !!config?.readonly || (store.get_state().workspace.config?.readonly ?? false);
  };

  // Workspace Manager
  const workspace = createWorkspaceManager(svg, viewportGroup, instanceId, isReadonly);
  cleanups.push(workspace.cleanup.destroy);

  // Apply persisted appearance tokens
  const savedAppearance = store.get_state().workspace.settings?.appearance || getAppearanceSettings();
  if (savedAppearance) {
    applyAppearanceTokens(savedAppearance.entity, savedAppearance.link);
  }

  // Sub-component: Toolset Shape Palette
  let palette: HTMLDivElement | undefined;
  if (!config?.headless && config?.menu?.toolbox?.available !== false) {
    palette = createShapePalette(instanceId, canvasWrap, viewport);
    canvasWrap.appendChild(palette);
  }

  // Drag and Drop handlers on Canvas Wrap
  canvasWrap.ondragover = e => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  canvasWrap.ondrop = e => {
    e.preventDefault();
    if (e.dataTransfer) {
      const groupData = e.dataTransfer.getData('application/atomos-group');
      if (groupData) {
        const { schemaId, name, print, groupColor } = JSON.parse(groupData);
        const rect = canvasWrap.getBoundingClientRect();
        const pos = viewport.screenToCanvas(e.clientX, e.clientY, rect);
        const id = `group-ent-${Date.now()}`;
        getEntityManager(instanceId).createEntity(
          id,
          name,
          { x: pos.x - 100, y: pos.y - 50 },
          { width: 220, height: 160 },
          {
            nodeType: 'group',
            isGroup: true,
            print,
            groupColor,
            schemaId
          } as any
        );
        return;
      }

      const shapeType = e.dataTransfer.getData('application/vbs-shape');
      const shapeColor = e.dataTransfer.getData('application/vbs-color');
      if (shapeType) {
        const rect = canvasWrap.getBoundingClientRect();
        const pos = viewport.screenToCanvas(e.clientX, e.clientY, rect);
        const worldX = pos.x;
        const worldY = pos.y;

        const id = `entity-${Date.now()}`;
        const metadata: any = { shape: shapeType };
        if (shapeColor) metadata.color = shapeColor;

        getEntityManager(instanceId).createEntity(
          id,
          `New ${shapeType}`,
          { x: worldX - 100, y: worldY - 50 },
          { width: 200, height: shapeType === 'box' || shapeType === 'rectangle' ? 100 : 180 },
          metadata
        );
      }
    }
  };

  createInteractiveEntityDemo(workspace, instanceId);

  let minimap: any = null;
  if (!config?.headless) {
    minimap = createMinimap(getEntityManager(instanceId), viewport, canvasWrap, palette);
    cleanups.push(minimap.cleanup.destroy);
  }

  // Entity search
  const entitySearch = createEntitySearch(getEntityManager(instanceId), viewport, canvasWrap);
  cleanups.push(entitySearch.cleanup.destroy);

  const doFitToScreen = () => {
    const entitiesMap = workspace.workspaceState.value.entities;
    if (entitiesMap.size === 0) {
      viewport.reset();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entitiesMap.forEach(e => {
      const px = e.position.value.x;
      const py = e.position.value.y;
      const w = e.dimensions.value.width;
      const h = e.dimensions.value.height;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px + w > maxX) maxX = px + w;
      if (py + h > maxY) maxY = py + h;
    });

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const rect = canvasWrap.getBoundingClientRect();
    const screenW = rect.width;
    const screenH = rect.height;

    if (screenW === 0 || screenH === 0) return;

    const scaleX = screenW / contentW;
    const scaleY = screenH / contentH;
    const zoom = Math.min(scaleX, scaleY, 1.5);

    const contentCenterX = minX + contentW / 2;
    const contentCenterY = minY + contentH / 2;

    const panX = screenW / 2 - contentCenterX * zoom;
    const panY = screenH / 2 - contentCenterY * zoom;

    const newVp = { zoom, pan: { x: panX, y: panY } };
    viewport.setExternalState(newVp);
    store.dispatch({ type: 'viewport-updated', viewport: newVp });
  };

  // Canvas Resize Observer
  let canvasResizeDebounce: any = null;
  const canvasResizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const isSmall = entry.contentRect.width < 500 || entry.contentRect.height < 400;
      if (isSmall !== isSmallCanvas) {
        isSmallCanvas = isSmall;
      }

      if (canvasResizeDebounce) clearTimeout(canvasResizeDebounce);
      canvasResizeDebounce = setTimeout(() => {
        const st = store.get_state();
        const activeCanvas = st.workspace.canvases[st.workspace.active_canvas_id];
        if (activeCanvas && activeCanvas.viewport) {
          store.dispatch({
            type: 'viewport-updated',
            viewport: {
              ...activeCanvas.viewport,
              container: { width: entry.contentRect.width, height: entry.contentRect.height }
            }
          });

          if (st.workspace.settings?.general?.autoFitOnResize !== false) {
            doFitToScreen();
          }
        }
      }, 300);
    }
  });
  canvasResizeObserver.observe(canvasWrap);
  cleanups.push(() => canvasResizeObserver.disconnect());

  const getKernel = () => {
    const st = store.get_state();
    const canvas = st.workspace.canvases[st.workspace.active_canvas_id];
    const schema = canvas?.schemas[canvas?.active_schema_id ?? ''];
    const entities = Object.fromEntries((schema?.entities ?? []).map(e => [e.id, e]));
    const links = Object.fromEntries((schema?.links ?? []).map(l => [l.id, l]));
    return createSchemaGraphKernel({ entities, links });
  };

  // Mount Floating Toolbar
  const { bottomBar, topBurger, destroy: destroyToolbar } = createCanvasToolbar({
    instanceId,
    viewport,
    entityManager: getEntityManager(instanceId),
    onFitToScreen: doFitToScreen,
    onSettings: () => {
      if (config?.headless) return;
      const st = store.get_state();
      store.dispatch({ type: 'settings-toggled', is_open: !st.is_settings_open });
    },
    getKernel,
    getSnapshot: () => canvasWrap.querySelector('svg') as SVGSVGElement
  });
  cleanups.push(destroyToolbar);

  if (!config?.headless) {
    canvasWrap.appendChild(bottomBar);

    if (schemaTabs) {
      schemaTabs.element.insertBefore(topBurger, schemaTabs.element.firstChild);
      topBurger.style.marginLeft = '8px';
    } else {
      topBurger.style.position = 'absolute';
      topBurger.style.top = '4px';
      topBurger.style.left = '4px';
      topBurger.style.zIndex = '50';
      root.appendChild(topBurger);
    }
  }

  // Sub-component: Inject Responsive Styles into Shadow DOM
  injectCanvasResponsiveStyles(shadowRoot);

  // Validation Overlay
  const validator = createSchemaValidator(store);
  cleanups.push(validator.cleanup);

  if (!config?.headless) {
    const validationOverlay = createValidationOverlay(validator, viewport, getEntityManager(instanceId), canvasWrap);
    cleanups.push(validationOverlay.cleanup.destroy);
  }

  cleanups.push(
    validator.subscribe(warnings => {
      window.dispatchEvent(
        new CustomEvent('vbs-validation-warnings', {
          detail: { instanceId, warnings }
        })
      );
    })
  );

  // Rubber-band multi-select
  const rubberBand = createRubberBand(svg, viewportGroup, viewport, getEntityManager(instanceId));
  cleanups.push(rubberBand.cleanup.destroy);
  cleanups.push(
    rubberBand.subscribe(ids => {
      getCanvasAdapter(instanceId).selectEntities(Array.from(ids));

      workspace.workspaceState.value.entities.forEach((instance, entityId) => {
        (instance.element as SVGElement).style.filter = ids.has(entityId) ? 'drop-shadow(0 0 6px #3b82f6)' : '';
      });
    })
  );

  // Shortcuts panel
  const shortcutsPanel = createShortcutsPanel();
  cleanups.push(shortcutsPanel.cleanup.destroy);

  // MCP live sync
  try {
    const mcpSync = createMcpSync(store, mcpServerUrl);
    cleanups.push(mcpSync.cleanup);
  } catch {
    /* noop */
  }

  // Settings & Schema Panel Sidebars
  const dagObserver = createDAGObserver(getEntityManager(instanceId));
  cleanups.push(dagObserver.cleanup);
  const schemaPanel = createSchemaPanel({
    instanceId,
    dagObserver,
    viewport,
    behaviorManager: workspace.behaviorManager,
    canvasContainer: canvasWrap
  });
  const settingsPage = createSettingsPage({
    initialSettings: {
      toolbox: getToolboxConfig(),
      general: getGeneralSettings() || undefined,
      appearance: getAppearanceSettings() || undefined,
      shapes: getCustomShapes()
    } as any,
    onClose: (hasUnsavedChanges) => {
      if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Discard them?')) return;
      store.dispatch({ type: 'settings-toggled', is_open: false });
    },
    onSave: (settings) => {
      setToolboxConfig(settings.toolbox);
      if (settings.general) setGeneralSettings(settings.general);
      if (settings.appearance) setAppearanceSettings(settings.appearance as any);
      if (settings.shapes) setCustomShapes(settings.shapes);
      window.alert('Settings saved. Reload may be required for some changes to take effect.');
    },
    getKernel
  });

  const sidebarContainer = document.createElement('div');
  sidebarContainer.style.cssText = 'display:contents;';
  sidebarContainer.appendChild(schemaPanel.element);
  sidebarContainer.appendChild(settingsPage.element);
  if (!config?.headless) {
    mainArea.appendChild(sidebarContainer);
  }

  // Toggle settings page visibility based on Redux store
  settingsPage.element.style.display = store.get_state().is_settings_open ? 'flex' : 'none';
  cleanups.push(
    store.subscribe(() => {
      const state = store.get_state();
      settingsPage.element.style.display = state.is_settings_open ? 'flex' : 'none';
    })
  );

  // Reconcile workspace DOM and signals with Redux state on undo/redo
  const reconcileWorkspaceWithStore = () => {
    const state = store.get_state();
    const activeCanvas = state.workspace?.canvases?.[state.workspace?.active_canvas_id];
    if (!activeCanvas) return;
    const activeSchema = activeCanvas.schemas?.[activeCanvas.active_schema_id];
    if (!activeSchema) return;

    const targetEntities = new Map((activeSchema.entities || []).map(e => [e.id, e]));
    const currentEntities = workspace.workspaceState.value.entities;
    const entityManager = getEntityManager(instanceId);

    // 1. Remove entities deleted by undo
    const toRemove: string[] = [];
    currentEntities.forEach((_, id) => {
      if (!targetEntities.has(id)) {
        toRemove.push(id);
      }
    });
    toRemove.forEach(id => {
      workspace.unregisterEntity(id);
    });

    // 2. Synchronize existing entities & restore entities created by undo
    targetEntities.forEach((reduxEntity, id) => {
      const existing = currentEntities.get(id);
      if (existing) {
        const rx = Number(reduxEntity.position?.x) || 0;
        const ry = Number(reduxEntity.position?.y) || 0;
        const curPos = existing.position.value;
        if (Math.abs(curPos.x - rx) > 0.5 || Math.abs(curPos.y - ry) > 0.5) {
          existing.position.set({ x: rx, y: ry });
        }
        const rw = Number(reduxEntity.dimensions?.width) || 200;
        const rh = Number(reduxEntity.dimensions?.height) || 100;
        const curDim = existing.dimensions.value;
        if (Math.abs(curDim.width - rw) > 0.5 || Math.abs(curDim.height - rh) > 0.5) {
          existing.dimensions.set({ width: rw, height: rh });
        }
        const desc = (reduxEntity as any).description;
        if (desc && existing.updateMetadata) {
          existing.updateMetadata({ description: desc });
        }
      } else {
        entityManager.reannounceEntity(id);
      }
    });

    // 3. Synchronize links
    const targetLinks = new Map((activeSchema.links || []).map(l => [l.id, l]));
    const currentLinks = workspace.linkManager.links.value;
    const linksToRemove: string[] = [];
    currentLinks.forEach((_, linkId) => {
      if (!targetLinks.has(linkId)) {
        linksToRemove.push(linkId);
      }
    });
    linksToRemove.forEach(linkId => {
      workspace.linkManager.removeLink(linkId);
    });

    targetLinks.forEach((_, linkId) => {
      if (!workspace.linkManager.getLink(linkId)) {
        entityManager.reannounceLink(linkId);
      }
    });
  };

  if (store.onUndoRedo) {
    cleanups.push(store.onUndoRedo(() => {
      reconcileWorkspaceWithStore();
    }));
  }

  // Global keyboard shortcuts for Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Cmd+Shift+Z)
  const handleCanvasKeyDown = (e: KeyboardEvent) => {
    const activeEl = (e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement | null;
    if (activeEl) {
      const tag = activeEl.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || activeEl.isContentEditable) {
        return;
      }
    }

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (!isCtrlOrCmd) return;

    const key = e.key.toLowerCase();
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        if (store.can_redo()) store.redo();
      } else {
        if (store.can_undo()) store.undo();
      }
    } else if (key === 'y') {
      e.preventDefault();
      if (store.can_redo()) store.redo();
    }
  };

  document.addEventListener('keydown', handleCanvasKeyDown);
  cleanups.push(() => document.removeEventListener('keydown', handleCanvasKeyDown));

  cleanups.push(schemaPanel.cleanup.destroy);
  cleanups.push(settingsPage.cleanup.destroy);

  return {
    element: host,
    store,
    viewport,
    workspace,
    cleanup: Object.assign(
      () => {
        cleanups.forEach(fn => {
          try {
            fn();
          } catch {
            /* noop */
          }
        });
      },
      {
        destroy: () => {
          cleanups.forEach(fn => {
            try {
              fn();
            } catch {
              /* noop */
            }
          });
        }
      }
    )
  };
};
