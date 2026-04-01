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
    border: 1px solid var(--atp-node-border, #e2e8f0);
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
    border-bottom: 1px solid var(--atp-node-border, #e2e8f0);
    border-top-left-radius: inherit;
    border-top-right-radius: inherit;
  }

  .content {
    padding: 12px;
  }
</style>
<div class="header" part="header">
  <span id="label" part="label">Node</span>
</div>
<div class="content" part="content">
  <slot></slot>
</div>
`;

export class AtpSchemaNode extends HTMLElement {
    #labelEl: HTMLSpanElement | null = null;
    #x = 0;
    #y = 0;
    
    // Drag state
    #isDragging = false;
    #startX = 0;
    #startY = 0;

    static get observedAttributes() {
        return ['data-id', 'label', 'x', 'y', 'selected'];
    }

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(schemaNodeTemplate.content.cloneNode(true));
        this.#labelEl = shadow.querySelector('#label');
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
