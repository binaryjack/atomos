const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    padding: 12px 16px;
    color: var(--tab-text-color, #94a3b8);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    user-select: none;
    white-space: nowrap;
    position: relative;
    outline: none;
  }

  :host(:hover) {
    color: var(--tab-active-text-color, #f8fafc);
    background-color: rgba(255,255,255,0.02);
  }

  :host([selected]) {
    color: var(--tab-active-text-color, #f8fafc);
    border-bottom-color: var(--tab-active-color, #a855f7);
  }

  :host(:focus-visible) {
    background-color: rgba(255,255,255,0.05);
  }
  
  :host(:focus-visible)::after {
    content: '';
    position: absolute;
    inset: 4px;
    border: 2px solid var(--tab-active-color, #a855f7);
    border-radius: 4px;
    pointer-events: none;
  }
</style>
<slot></slot>
`;

export class VbsTab extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this._onClick = this._onClick.bind(this);
  }

  connectedCallback() {
    this.setAttribute('role', 'tab');
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '-1');
    }
    this.addEventListener('click', this._onClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
  }

  get selected(): boolean {
    return this.hasAttribute('selected');
  }

  set selected(val: boolean) {
    if (val) {
      this.setAttribute('selected', '');
      this.setAttribute('aria-selected', 'true');
    } else {
      this.removeAttribute('selected');
      this.setAttribute('aria-selected', 'false');
    }
  }

  get value(): string {
    return this.getAttribute('value') || '';
  }

  set value(val: string) {
    this.setAttribute('value', val);
  }

  private _onClick() {
    this.dispatchEvent(new CustomEvent('vbs-tab-click', {
      bubbles: true,
      composed: true,
      detail: { value: this.value }
    }));
  }
}

customElements.define('vbs-tab', VbsTab);
