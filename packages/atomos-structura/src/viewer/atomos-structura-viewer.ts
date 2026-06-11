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
    `;

    // Ensure design tokens are in the document head so CSS vars resolve correctly
    injectDesignSystemTokens();

    this.svgContainer = this.shadowRoot!.querySelector('svg')!;
    this.contentRoot = this.shadowRoot!.querySelector('.viewport-group')!;

    this.viewerEngine = createStructuraViewer(this.svgContainer, this.contentRoot);

    if (this._schema) {
      this.viewerEngine.loadSchema(this._schema);
    }
    
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

  private setupBasicInteraction() {
    let isPanning = false;
    let startX = 0, startY = 0;
    let tx = 0, ty = 0;
    let scale = 1;

    const updateTransform = () => {
      this.contentRoot.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`);
    };

    this.svgContainer.addEventListener('mousedown', (e) => {
      isPanning = true;
      startX = e.clientX - tx;
      startY = e.clientY - ty;
      this.svgContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      tx = e.clientX - startX;
      ty = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      this.svgContainer.style.cursor = 'default';
    });

    this.svgContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.1, scale + delta), 5);
      
      // Calculate cursor position relative to container
      const rect = this.svgContainer.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      // Adjust translation so zooming is centered on cursor
      tx = cx - (cx - tx) * (newScale / scale);
      ty = cy - (cy - ty) * (newScale / scale);
      scale = newScale;
      
      updateTransform();
    }, { passive: false });
  }
}

if (!customElements.get('atomos-structura-viewer')) {
  customElements.define('atomos-structura-viewer', AtomosStructuraViewerElement);
}
