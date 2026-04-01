const template = document.createElement('template');
template.innerHTML = `<style>
  :host {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }
  ::slotted([slot="label"]) {
    font-size: 13px;
    font-weight: 500;
    color: #cbd5e1;
    font-family: system-ui, sans-serif;
  }
  ::slotted([slot="input"]) {
    width: 100%;
    box-sizing: border-box;
  }
  ::slotted([slot="validation"]) {
    min-height: 16px;
  }
</style>
<slot name="label"></slot>
<slot name="input"></slot>
<slot name="validation"></slot>`;

export class AtpFieldSet extends HTMLElement {
  constructor() {
    super();
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
    }
  }
}

if (!customElements.get('atp-field-set')) {
  customElements.define('atp-field-set', AtpFieldSet);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-field-set': AtpFieldSet;
  }
}
