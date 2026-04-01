import type { IFormular, IObjectShape, IValidationResult } from '@binaryjack/formular.dev';

const template = document.createElement('template');
template.innerHTML = `<style>
  :host {
    display: block;
    min-height: 16px;
    font-size: 12px;
    line-height: 1.5;
    font-family: system-ui, sans-serif;
  }
  p {
    margin: 0;
  }
</style>
<div id="content"></div>`;

export class VbsValidationResult extends HTMLElement {
  #unobserve: (() => void) | null = null;
  #form: IFormular<IObjectShape> | null = null;
  #fieldName: string | null = null;
  #focused = false;
  #guideText: string | null = null;
  #contentPart: HTMLDivElement | null = null;

  static get observedAttributes(): string[] {
    return ['field-name', 'guide-text'];
  }

  constructor() {
    super();
    if (!this.shadowRoot) {
      const shadow = this.attachShadow({ mode: 'open' });
      shadow.appendChild(template.content.cloneNode(true));
      this.#contentPart = shadow.querySelector('#content');
    } else {
      this.#contentPart = this.shadowRoot.querySelector('#content');
    }
  }

  connectedCallback(): void {
    this.#render();
  }

  disconnectedCallback(): void {
    this.#unobserve?.();
    this.#unobserve = null;
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (oldVal === newVal) return;
    if (name === 'field-name') {
      this.#fieldName = newVal;
      this.#subscribe();
    } else if (name === 'guide-text') {
      this.#guideText = newVal;
      this.#render();
    }
  }

  get form(): IFormular<IObjectShape> | null {
    return this.#form;
  }

  set form(f: IFormular<IObjectShape> | null) {
    this.#form = f;
    this.#subscribe();
  }

  get fieldName(): string | null {
    return this.getAttribute('field-name') || this.#fieldName;
  }

  set fieldName(name: string | null) {
    if (name) {
      this.setAttribute('field-name', name);
    } else {
      this.removeAttribute('field-name');
    }
  }

  get guideText(): string | null {
    return this.getAttribute('guide-text') || this.#guideText;
  }

  set guideText(text: string | null) {
    if (text) {
      this.setAttribute('guide-text', text);
    } else {
      this.removeAttribute('guide-text');
    }
  }

  setFocused(focused: boolean): void {
    this.#focused = focused;
    this.#render();
  }

  refresh(): void {
    this.#render();
  }

  #subscribe(): void {
    if (!this.#form || !this.#fieldName) return;
    this.#unobserve?.();
    this.#unobserve = this.#form.observe(this.#fieldName, () => this.#render());
    this.#render();
  }

  #render(): void {
    if (!this.#contentPart) return;
    
    if (!this.#form || !this.#fieldName) {
      this.style.display = 'none';
      return;
    }

    const extField = this.#form.getField(this.#fieldName);
    if (!extField) {
      this.style.display = 'none';
      return;
    }

    const inp = extField.input as unknown as {
      validationResults?: IValidationResult[];
    };
    const results: IValidationResult[] = inp.validationResults ?? [];
    const failed = results.filter(r => !r.state);

    this.#contentPart.innerHTML = '';

    if (this.#focused) {
      // Always show guide text on focus if provided
      if (this.#guideText) {
        this.style.display = 'block';
        this.style.color = '#38bdf8';
        const p = document.createElement('p');
        p.textContent = this.#guideText;
        this.#contentPart.appendChild(p);
      } else if (failed.length > 0) {
        // No explicit guide — show error hints in blue as fallback
        this.style.display = 'block';
        this.style.color = '#38bdf8';
        const contentPart = this.#contentPart;
        failed.forEach(r => {
          const p = document.createElement('p');
          p.textContent = r.guide ?? r.error ?? r.code;
          contentPart.appendChild(p);
        });
      } else {
        this.style.display = 'none';
      }
      return;
    }

    if (failed.length === 0) {
      this.style.display = 'none';
      return;
    }

    this.style.display = 'block';
    this.style.color = '#f87171';
    const contentPart = this.#contentPart;
    failed.forEach(r => {
      const p = document.createElement('p');
      p.textContent = r.error ?? r.code;
      contentPart.appendChild(p);
    });
  }
}

if (!customElements.get('vbs-validation-result')) {
  customElements.define('vbs-validation-result', VbsValidationResult);
}

declare global {
  interface HTMLElementTagNameMap {
    'vbs-validation-result': VbsValidationResult;
  }
}
