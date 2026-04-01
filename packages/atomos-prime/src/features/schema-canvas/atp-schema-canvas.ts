export const schemaCanvasTemplate = document.createElement('template');
schemaCanvasTemplate.innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--atp-canvas-bg, #f8f9fa);
    overflow: hidden;
    box-sizing: border-value; /* wait, border-box */
  }
  .stage {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
  }
</style>
<div class="stage" part="stage">
  <slot></slot>
</div>
`;

export class AtpSchemaCanvas extends HTMLElement {
    #stage: HTMLDivElement | null = null;
    
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.appendChild(schemaCanvasTemplate.content.cloneNode(true));
        this.#stage = shadow.querySelector('.stage');
    }

    connectedCallback() {
        // Setup base pan/zoom bindings in the future
    }

    disconnectedCallback() {
        // Cleanup event listeners
    }
}

if (!customElements.get('atp-schema-canvas')) {
    customElements.define('atp-schema-canvas', AtpSchemaCanvas);
}
