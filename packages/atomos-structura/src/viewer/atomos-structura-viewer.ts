import { createStructuraViewer } from './create-structura-viewer.js'
import type { DAGExchange } from '../core/application/dag-service.js'
import { injectDesignSystemTokens } from '../core/presentation/design-system.js'
import { createInspectorDrawer, type InspectorDrawerController } from './create-inspector-drawer.js'
import type { StructuraEntityInspectorData } from './types/inspector.types.js'

// @ts-ignore - Vite will resolve this
import primeStyleContent from '@atomos-web/prime-style/dist/styles.css?raw'

export class AtomosStructuraViewerElement extends HTMLElement {
  private svgContainer!: SVGSVGElement;
  private contentRoot!: SVGGElement;
  private viewerEngine: ReturnType<typeof createStructuraViewer> | null = null;
  private inspectorDrawer: InspectorDrawerController | null = null;
  private _schema: DAGExchange | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private _enableInspectorDrawer = true;
  private _drawerMode: 'push' | 'overlay' = 'push';
  private inspectorDataStore = new Map<string, StructuraEntityInspectorData>();

  static get observedAttributes() {
    return ['enable-inspector-drawer', 'drawer-mode'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    if (name === 'enable-inspector-drawer') {
      this._enableInspectorDrawer = newValue !== 'false';
    } else if (name === 'drawer-mode') {
      const mode = newValue === 'overlay' ? 'overlay' : 'push';
      if (this._drawerMode !== mode) {
        this._drawerMode = mode;
        if (this.inspectorDrawer) {
          this.inspectorDrawer.setMode(mode);
        }
      }
    }
  }

  get enableInspectorDrawer(): boolean {
    return this._enableInspectorDrawer;
  }

  set enableInspectorDrawer(val: boolean) {
    const boolVal = Boolean(val);
    this._enableInspectorDrawer = boolVal;
    if (boolVal && this.getAttribute('enable-inspector-drawer') !== 'true') {
      this.setAttribute('enable-inspector-drawer', 'true');
    } else if (!boolVal && this.getAttribute('enable-inspector-drawer') !== 'false') {
      this.setAttribute('enable-inspector-drawer', 'false');
      this.closeInspector();
    }
  }

  get drawerMode(): 'push' | 'overlay' {
    return this._drawerMode;
  }

  set drawerMode(val: 'push' | 'overlay') {
    const mode = val === 'overlay' ? 'overlay' : 'push';
    if (this._drawerMode !== mode) {
      this._drawerMode = mode;
      if (this.getAttribute('drawer-mode') !== mode) {
        this.setAttribute('drawer-mode', mode);
      }
      if (this.inspectorDrawer) {
        this.inspectorDrawer.setMode(mode);
      }
    }
  }

  connectedCallback() {
    if (this.hasAttribute('enable-inspector-drawer')) {
      this._enableInspectorDrawer = this.getAttribute('enable-inspector-drawer') !== 'false';
    } else {
      this.setAttribute('enable-inspector-drawer', 'true');
    }

    if (this.hasAttribute('drawer-mode')) {
      this._drawerMode = this.getAttribute('drawer-mode') === 'overlay' ? 'overlay' : 'push';
    } else {
      this.setAttribute('drawer-mode', 'push');
    }

    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          background: var(--vbs-bg-canvas, #020617);
          overflow: hidden;
        }
        .structura-viewer-container {
          display: flex;
          flex-direction: row;
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }
        .structura-canvas-wrapper {
          flex: 1 1 0%;
          min-width: 0;
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          transition: all 250ms ease;
        }
        svg {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <div class="structura-viewer-container">
        <div class="structura-canvas-wrapper">
          <svg xmlns="http://www.w3.org/2000/svg">
            <g class="viewport-group"></g>
          </svg>
          <div class="zoom-bar">
            <button id="zoom-in" title="Zoom In">+</button>
            <button id="zoom-out" title="Zoom Out">-</button>
            <button id="zoom-fit" title="Fit to Screen">Fit</button>
          </div>
        </div>
      </div>
      <style>
        .zoom-bar {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          background: var(--vbs-bg-panel, #1e293b);
          border: 1px solid var(--vbs-border, #334155);
          border-radius: var(--vbs-radius, 6px);
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
          z-index: 10;
        }
        .zoom-bar button {
          background: transparent;
          border: none;
          color: var(--vbs-text-primary, #f8fafc);
          padding: 8px 14px;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .zoom-bar button:hover {
          background: var(--vbs-bg-hover, #334155);
        }
        .zoom-bar button:not(:last-child) {
          border-right: 1px solid var(--vbs-border, #334155);
        }
      </style>
    `;

    // Ensure design tokens are in the document head so CSS vars resolve correctly
    injectDesignSystemTokens();

    const styleEl = document.createElement('style');
    styleEl.textContent = primeStyleContent;
    this.shadowRoot!.appendChild(styleEl);

    const viewerContainer = this.shadowRoot!.querySelector('.structura-viewer-container')! as HTMLElement;
    this.svgContainer = this.shadowRoot!.querySelector('svg')!;
    this.contentRoot = this.shadowRoot!.querySelector('.viewport-group')!;

    // Instantiate Inspector Drawer inside viewerContainer
    this.inspectorDrawer = createInspectorDrawer(viewerContainer);
    this.inspectorDrawer.setMode(this._drawerMode);
    viewerContainer.appendChild(this.inspectorDrawer.element);

    this.viewerEngine = createStructuraViewer(
      this.svgContainer, 
      this.contentRoot, 
      (tx, ty, scale) => this.setViewport(tx, ty, scale),
      (entityId, nodeData) => this.handleEntityClick(entityId, nodeData)
    );

    if (this._schema) {
      this.viewerEngine.loadSchema(this._schema);
    }
    
    // Setup Zoom Bar listeners
    this.shadowRoot!.getElementById('zoom-in')!.addEventListener('click', () => {
      this.zoomByRatio(1.2);
    });
    this.shadowRoot!.getElementById('zoom-out')!.addEventListener('click', () => {
      this.zoomByRatio(1 / 1.2);
    });
    this.shadowRoot!.getElementById('zoom-fit')!.addEventListener('click', () => {
      if (this.viewerEngine && this._schema) {
        this.viewerEngine.fitToScreen();
      }
    });

    // Add basic pan/zoom for the viewer using pure DOM events
    this.setupBasicInteraction();
    
    // Auto fit-to-screen on canvas wrapper resize
    const canvasWrapper = this.shadowRoot!.querySelector('.structura-canvas-wrapper')!;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.viewerEngine && this._schema) {
          this.viewerEngine.fitToScreen();
        }
      });
      this.resizeObserver.observe(canvasWrapper);
    }

  }

  disconnectedCallback() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.viewerEngine) {
      this.viewerEngine.cleanup();
      this.viewerEngine = null;
    }
    if (this.inspectorDrawer) {
      this.inspectorDrawer.destroy();
      this.inspectorDrawer = null;
    }
  }

  private handleEntityClick(entityId: string, nodeData: any) {
    const customEvent = new CustomEvent('entity-inspect', {
      detail: { entityId, nodeData },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(customEvent);

    if (this._enableInspectorDrawer) {
      const storedData = this.inspectorDataStore.get(entityId);
      if (storedData) {
        this.openInspector(entityId, storedData);
      } else {
        // Derive initial inspector data from node metadata & execution
        const inferredData: StructuraEntityInspectorData = {
          entityId,
          title: nodeData.name || entityId,
          status: nodeData.execution?.status || 'in_progress',
          role: nodeData.execution?.role || nodeData.nodeType || 'Agent Specialist',
          executionDurationMs: nodeData.execution?.durationMs,
          lora: nodeData.execution?.lora,
          task: nodeData.execution?.task || (Array.isArray(nodeData.properties) && nodeData.properties.length > 0 ? { description: `Entity properties: ${nodeData.properties.length}` } : undefined),
          stagedFiles: nodeData.execution?.stagedFiles,
          thinkingLog: nodeData.execution?.thinkingLog,
          error: nodeData.execution?.error,
        };
        this.openInspector(entityId, inferredData);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public Inspector Drawer API
  // ---------------------------------------------------------------------------

  public openInspector(entityId: string, data?: StructuraEntityInspectorData): void {
    if (data) {
      this.inspectorDataStore.set(entityId, data);
    }
    const resolvedData = data || this.inspectorDataStore.get(entityId);
    if (this.inspectorDrawer) {
      this.inspectorDrawer.open(entityId, resolvedData);
      this.dispatchEvent(new CustomEvent('inspector-open', {
        detail: { entityId, data: resolvedData },
        bubbles: true,
        composed: true,
      }));
      if (this._drawerMode === 'push') {
        setTimeout(() => {
          if (this.viewerEngine && this._schema) {
            this.viewerEngine.fitToScreen();
          }
        }, 260);
      }
    }
  }

  public closeInspector(): void {
    if (this.inspectorDrawer && this.inspectorDrawer.isOpen()) {
      this.inspectorDrawer.close();
      this.dispatchEvent(new CustomEvent('inspector-close', {
        bubbles: true,
        composed: true,
      }));
      if (this._drawerMode === 'push') {
        setTimeout(() => {
          if (this.viewerEngine && this._schema) {
            this.viewerEngine.fitToScreen();
          }
        }, 260);
      }
    }
  }

  public setInspectorData(data: StructuraEntityInspectorData): void {
    this.inspectorDataStore.set(data.entityId, data);
    if (this.inspectorDrawer && this.inspectorDrawer.isOpen() && this.inspectorDrawer.getData()?.entityId === data.entityId) {
      this.inspectorDrawer.setData(data);
    }
  }

  set schema(dag: DAGExchange | null) {
    this._schema = dag;
    if (this.viewerEngine && dag) {
      this.viewerEngine.loadSchema(dag);
    }
  }

  get schema(): DAGExchange | null {
    return this._schema;
  }
  
  /**
   * Patches an existing entity directly using signals (no re-render).
   * Useful for live MCP updates (e.g. progress bar updates).
   */
  patchEntity(entityId: string, updates: any) {
    if (this.viewerEngine) {
      this.viewerEngine.patchEntity(entityId, updates);
    }
    // Also patch stored inspector data if execution updates occur
    if (updates.execution) {
      const existing = this.inspectorDataStore.get(entityId);
      if (existing) {
        const updated: StructuraEntityInspectorData = {
          ...existing,
          status: updates.execution.status ?? existing.status,
          thinkingLog: updates.execution.thinkingLog ?? existing.thinkingLog,
          error: updates.execution.error ?? existing.error,
          executionDurationMs: updates.execution.durationMs ?? existing.executionDurationMs,
        };
        this.setInspectorData(updated);
      }
    }
  }

  /**
   * Patches an existing link directly (e.g. for flow animations).
   */
  patchLink(linkId: string, updates: any) {
    if (this.viewerEngine) {
      this.viewerEngine.patchLink(linkId, updates);
    }
  }

  private tx = 0;
  private ty = 0;
  private scale = 1;

  private zoomByRatio(ratio: number) {
    const newScale = Math.min(Math.max(0.1, this.scale * ratio), 5);
    const rect = this.svgContainer.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const newTx = cx - (cx - this.tx) * (newScale / this.scale);
    const newTy = cy - (cy - this.ty) * (newScale / this.scale);
    
    this.setViewport(newTx, newTy, newScale);
  }

  setViewport(tx: number, ty: number, scale: number) {
    // Clamp panning boundaries
    let clampedTx = tx;
    let clampedTy = ty;
    
    try {
      const bbox = this.contentRoot.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const rect = this.svgContainer.getBoundingClientRect();
        const padX = rect.width * 0.8;
        const padY = rect.height * 0.8;

        const minTx = rect.width - (bbox.x + bbox.width) * scale - padX;
        const maxTx = -bbox.x * scale + padX;
        const minTy = rect.height - (bbox.y + bbox.height) * scale - padY;
        const maxTy = -bbox.y * scale + padY;

        // Ensure min <= max
        const trueMinTx = Math.min(minTx, maxTx);
        const trueMaxTx = Math.max(minTx, maxTx);
        const trueMinTy = Math.min(minTy, maxTy);
        const trueMaxTy = Math.max(minTy, maxTy);

        clampedTx = Math.min(Math.max(tx, trueMinTx), trueMaxTx);
        clampedTy = Math.min(Math.max(ty, trueMinTy), trueMaxTy);
      }
    } catch (e) {
      // getBBox can throw on empty/hidden SVGs in some browsers
    }

    this.tx = Number.isFinite(clampedTx) ? clampedTx : 0;
    this.ty = Number.isFinite(clampedTy) ? clampedTy : 0;
    this.scale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    this.updateTransform();
  }

  private updateTransform() {
    this.contentRoot.setAttribute('transform', `translate(${this.tx},${this.ty}) scale(${this.scale})`);
  }

  private setupBasicInteraction() {
    let isPanning = false;
    let startX = 0, startY = 0;

    this.svgContainer.addEventListener('mousedown', (e) => {
      isPanning = true;
      startX = e.clientX - this.tx;
      startY = e.clientY - this.ty;
      this.svgContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      this.tx = e.clientX - startX;
      this.ty = e.clientY - startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      this.svgContainer.style.cursor = 'default';
    });

    this.svgContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.1, this.scale + delta), 5);
      
      // Calculate cursor position relative to container
      const rect = this.svgContainer.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Adjust translation so zooming is centered on cursor
      const newTx = cx - (cx - this.tx) * (newScale / this.scale);
      const newTy = cy - (cy - this.ty) * (newScale / this.scale);
      
      this.setViewport(newTx, newTy, newScale);
    }, { passive: false });
  }
}

if (!customElements.get('atomos-structura-viewer')) {
  customElements.define('atomos-structura-viewer', AtomosStructuraViewerElement);
}
