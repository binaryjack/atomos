export const schemaEdgeTemplate = document.createElement('template');
schemaEdgeTemplate.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    overflow: visible;
    pointer-events: none; /* By default let events pass through the container */
    z-index: 5;
  }
  
  svg {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    pointer-events: none;
  }

  path {
    fill: none;
    stroke: var(--atp-edge-stroke, #94a3b8);
    stroke-width: var(--atp-edge-width, 2px);
    pointer-events: stroke; /* allow clicking strictly on the stroke itself */
    cursor: pointer;
    transition: stroke 0.2s ease, stroke-width 0.2s ease;
  }

  :host([selected]) path {
    stroke: var(--atp-edge-stroke-selected, #3182ce);
    stroke-width: var(--atp-edge-width-selected, 3px);
  }
</style>
<svg>
  <path id="line" part="line"></path>
</svg>
`;

export class AtpSchemaEdge extends HTMLElement {
    #pathEl: SVGPathElement | null = null;
    #x1 = 0;
    #y1 = 0;
    #x2 = 0;
    #y2 = 0;

    static get observedAttributes() {
        return ['data-id', 'x1', 'y1', 'x2', 'y2', 'selected'];
    }

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(schemaEdgeTemplate.content.cloneNode(true));
        this.#pathEl = shadow.querySelector('#line');
    }

    connectedCallback() {
        this.#updatePath();
    }

    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null) {
        if (name === 'x1') this.#x1 = parseFloat(newVal || '0') || 0;
        if (name === 'y1') this.#y1 = parseFloat(newVal || '0') || 0;
        if (name === 'x2') this.#x2 = parseFloat(newVal || '0') || 0;
        if (name === 'y2') this.#y2 = parseFloat(newVal || '0') || 0;
        
        if (['x1', 'y1', 'x2', 'y2'].includes(name)) {
            this.#updatePath();
        }
    }

    get dataId() { return this.getAttribute('data-id') || ''; }
    set dataId(val) { this.setAttribute('data-id', val); }

    get x1() { return this.#x1; }
    set x1(val) { 
        this.#x1 = val;
        this.setAttribute('x1', String(val)); 
    }

    get y1() { return this.#y1; }
    set y1(val) { 
        this.#y1 = val;
        this.setAttribute('y1', String(val)); 
    }

    get x2() { return this.#x2; }
    set x2(val) { 
        this.#x2 = val;
        this.setAttribute('x2', String(val)); 
    }

    get y2() { return this.#y2; }
    set y2(val) { 
        this.#y2 = val;
        this.setAttribute('y2', String(val)); 
    }

    #updatePath() {
        if (!this.#pathEl) return;
        
        // Simple bezier curve for smooth edges
        const dx = Math.abs(this.#x2 - this.#x1);
        const cpOffset = Math.max(dx / 2, 40); // curve parameter

        const d = `M ${this.#x1} ${this.#y1} C ${this.#x1 + cpOffset} ${this.#y1}, ${this.#x2 - cpOffset} ${this.#y2}, ${this.#x2} ${this.#y2}`;
        
        this.#pathEl.setAttribute('d', d);
    }
}

if (!customElements.get('atp-schema-edge')) {
    customElements.define('atp-schema-edge', AtpSchemaEdge);
}
