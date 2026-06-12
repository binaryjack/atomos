import { createStructuraViewer } from './create-structura-viewer.js'
import type { DAGExport } from '../core/application/dag-service.js'
import { injectDesignSystemTokens } from '../core/presentation/design-system.js'

export class AtomosStructuraViewerElement extends HTMLElement {
  private svgContainer!: SVGSVGElement;
  private contentRoot!: SVGGElement;
  private viewerEngine: ReturnType<typeof createStructuraViewer> | null = null;
  private _schema: DAGExport | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
          background: var(--vbs-bg-canvas, #0f172a);
          overflow: hidden;
        }
        svg {
          width: 100%;
          height: 100%;
          display: block;
        }
      </style>
      <svg xmlns="http://www.w3.org/2000/svg">
        <!-- Grid pattern could be injected here -->
        <g class="viewport-group"></g>
      </svg>
      <div class="zoom-bar">
        <button id="zoom-in" title="Zoom In">+</button>
        <button id="zoom-out" title="Zoom Out">-</button>
        <button id="zoom-fit" title="Fit to Screen">Fit</button>
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

    this.svgContainer = this.shadowRoot!.querySelector('svg')!;
    this.contentRoot = this.shadowRoot!.querySelector('.viewport-group')!;

    this.viewerEngine = createStructuraViewer(
      this.svgContainer, 
      this.contentRoot, 
      (tx, ty, scale) => this.setViewport(tx, ty, scale)
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
        // Triggering loadSchema will re-run the layout and fit logic
        this.viewerEngine.loadSchema(this._schema);
      }
    });

    // Add basic pan/zoom for the viewer using pure DOM events
    this.setupBasicInteraction();
  }

  disconnectedCallback() {
    if (this.viewerEngine) {
      this.viewerEngine.cleanup();
      this.viewerEngine = null;
    }
  }

  set schema(dag: DAGExport | null) {
    this._schema = dag;
    if (this.viewerEngine && dag) {
      this.viewerEngine.loadSchema(dag);
    }
  }

  get schema(): DAGExport | null {
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

    this.tx = clampedTx;
    this.ty = clampedTy;
    this.scale = scale;
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
