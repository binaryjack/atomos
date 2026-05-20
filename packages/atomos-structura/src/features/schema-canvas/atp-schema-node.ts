export const schemaNodeTemplate = document.createElement('template');
schemaNodeTemplate.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    transform: translate(0, 0);
    box-sizing: border-box;
    min-width: 150px;
    background: var(--atp-node-bg, #ffffff);
    border: 1px solid var(--atp-node-border, var(--vbs-text-primary, #f4f4f5));
    border-radius: var(--atp-node-radius, 6px);
    box-shadow: var(--atp-node-shadow, 0 1px 3px rgba(0,0,0,0.1));
    cursor: grab;
    user-select: none;
    z-index: 10;
  }
  
  :host([selected]) {
    border-color: var(--atp-node-border-selected, #3182ce);
    box-shadow: var(--atp-node-shadow-selected, 0 0 0 2px rgba(49, 130, 206, 0.4));
  }

  :host(:active) {
    cursor: grabbing;
    z-index: 100;
  }

  .header {
    padding: 8px 12px;
    background: var(--atp-node-header-bg, #edf2f7);
    color: var(--atp-node-header-fg, #2d3748);
    font-weight: 500;
    border-bottom: 1px solid var(--atp-node-border, var(--vbs-text-primary, #f4f4f5));
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .status-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 10px;
    background: #718096;
    color: white;
    text-transform: uppercase;
  }

  :host([status="running"]) .status-badge { background: #3182ce; animation: pulse 2s infinite; }
  :host([status="success"]) .status-badge { background: #48bb78; }
  :host([status="failed"]) .status-badge { background: #e53e3e; }
  
  :host([status="running"]) { border-color: #3182ce; }
  :host([status="success"]) { border-color: #48bb78; }
  :host([status="failed"]) { border-color: #e53e3e; }
  
  :host([active="false"]) { opacity: 0.5; filter: grayscale(1); }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }

  .content {
    padding: 12px;
  }

  .node-type {
    font-size: 9px;
    color: var(--atp-node-header-fg, #4a5568);
    opacity: 0.7;
    margin-bottom: 4px;
    display: block;
    text-transform: uppercase;
    font-weight: bold;
  }

  .log-stream {
    margin-top: 8px;
    padding: 6px;
    background: #1a202c;
    color: #cbd5e0;
    font-family: monospace;
    font-size: 10px;
    border-radius: 4px;
    max-height: 120px;
    overflow-y: auto;
    white-space: pre-wrap;
    display: none;
    border: 1px solid #2d3748;
  }

  :host([has-logs]) .log-stream {
    display: block;
  }
</style>
<div class="header" part="header">
  <div style="display:flex; flex-direction:column">
    <span id="node-type" class="node-type">Implementation</span>
    <span id="label" part="label">Node</span>
  </div>
  <span id="status" class="status-badge" part="status">pending</span>
</div>
<div class="content" part="content">
  <slot></slot>
  <div id="log-stream" class="log-stream" part="logs"></div>
</div>
`;

export class AtpSchemaNode extends HTMLElement {
    #labelEl: HTMLSpanElement | null = null;
    #statusEl: HTMLSpanElement | null = null;
    #typeEl: HTMLSpanElement | null = null;
    #logEl: HTMLDivElement | null = null;
    #x = 0;
    #y = 0;
    
    // Drag state
    #isDragging = false;
    #startX = 0;
    #startY = 0;

    static get observedAttributes() {
        return ['data-id', 'label', 'x', 'y', 'selected', 'status', 'log-stream', 'active', 'type'];
    }

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(schemaNodeTemplate.content.cloneNode(true));
        this.#labelEl = shadow.querySelector('#label');
        this.#statusEl = shadow.querySelector('#status');
        this.#typeEl = shadow.querySelector('#node-type');
        this.#logEl = shadow.querySelector('#log-stream');
    }

    connectedCallback() {
        this.addEventListener('pointerdown', this.#onPointerDown);
        this.#updateTransform();
    }

    disconnectedCallback() {
        this.removeEventListener('pointerdown', this.#onPointerDown);
    }

    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
        if (name === 'label' && this.#labelEl) {
            this.#labelEl.textContent = newVal || 'Node';
        }
        if (name === 'type' && this.#typeEl) {
            this.#typeEl.textContent = newVal || 'Implementation';
        }
        if (name === 'status' && this.#statusEl) {
            this.#statusEl.textContent = newVal || 'pending';
        }
        if (name === 'log-stream' && this.#logEl) {
            this.#logEl.textContent = newVal || '';
            if (newVal) {
                this.setAttribute('has-logs', '');
                // Auto-scroll logs
                this.#logEl.scrollTop = this.#logEl.scrollHeight;
            } else {
                this.removeAttribute('has-logs');
            }
        }
        if (name === 'x') {
            this.#x = parseFloat(newVal || '0') || 0;
            this.#updateTransform();
        }
        if (name === 'y') {
            this.#y = parseFloat(newVal || '0') || 0;
            this.#updateTransform();
        }
    }

    // Getters and Setters explicitly mapping to observed attributes
    get dataId() { return this.getAttribute('data-id') || ''; }
    set dataId(val) { this.setAttribute('data-id', val); }

    get label() { return this.getAttribute('label') || ''; }
    set label(val) { this.setAttribute('label', val); }

    get x() { return this.#x; }
    set x(val) { 
        this.#x = val;
        this.setAttribute('x', String(val)); 
    }

    get y() { return this.#y; }
    set y(val) { 
        this.#y = val;
        this.setAttribute('y', String(val)); 
    }

    #updateTransform() {
        this.style.transform = `translate(${this.#x}px, ${this.#y}px)`;
    }

    // --- Drag Handling --- //
    #onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0) return; // Only left-click
        // Prevent default text selection during pointerdown
        e.preventDefault(); 
        
        this.setPointerCapture(e.pointerId);
        this.#isDragging = true;
        this.#startX = e.clientX - this.#x;
        this.#startY = e.clientY - this.#y;

        this.addEventListener('pointermove', this.#onPointerMove);
        this.addEventListener('pointerup', this.#onPointerUp);
        this.addEventListener('pointercancel', this.#onPointerUp);
        
        // Dispatch custom select event
        this.dispatchEvent(new CustomEvent('atp-node-select', {
            bubbles: true,
            composed: true,
            detail: { id: this.dataId }
        }));
    }

    #onPointerMove = (e: PointerEvent) => {
        if (!this.#isDragging) return;
        
        const nextX = e.clientX - this.#startX;
        const nextY = e.clientY - this.#startY;
        
        // Optimistic UI update (optional, could be strictly driven by kernel)
        this.x = nextX;
        this.y = nextY;
    }

    #onPointerUp = (e: PointerEvent) => {
        if (!this.#isDragging) return;
        this.#isDragging = false;
        this.releasePointerCapture(e.pointerId);
        
        this.removeEventListener('pointermove', this.#onPointerMove);
        this.removeEventListener('pointerup', this.#onPointerUp);
        this.removeEventListener('pointercancel', this.#onPointerUp);

        // Tell the canvas/manager it moved
        this.dispatchEvent(new CustomEvent('atp-node-move', {
            bubbles: true,
            composed: true,
            detail: { id: this.dataId, x: this.x, y: this.y }
        }));
    }
}

if (!customElements.get('atp-schema-node')) {
    customElements.define('atp-schema-node', AtpSchemaNode);
}
