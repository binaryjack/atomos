import type { IFieldError, IFieldGuide, IFormular, IObjectShape } from '@binaryjack/formular.dev';

const template = document.createElement('template');
template.innerHTML = `<style>
  :host {
    display: none;
    min-height: 18px;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
  }
  p {
    margin: 0;
  }
</style>
<div id="content"></div>`;

export class AtpFieldGuide extends HTMLElement {
  #unobserve: (() => void) | null = null;
  #form: IFormular<IObjectShape> | null = null;
  #fieldName: string | null = null;
  #getIsFocused: (() => boolean) | null = null;
  #contentPart: HTMLDivElement | null = null;

  static get observedAttributes(): string[] {
    return ['field-name'];
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
    }
  }

  get form(): IFormular<IObjectShape> | null { return this.#form; }
  set form(f: IFormular<IObjectShape> | null) {
    this.#form = f;
    this.#subscribe();
  }

  get fieldName(): string | null {
    return this.getAttribute('field-name') || this.#fieldName;
  }
  set fieldName(name: string | null) {
    if (name) this.setAttribute('field-name', name);
    else this.removeAttribute('field-name');
  }

  get getIsFocused(): (() => boolean) | null { return this.#getIsFocused; }
  set getIsFocused(fn: (() => boolean) | null) {
    this.#getIsFocused = fn;
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

    if (!this.#form || !this.#fieldName || !this.#getIsFocused) {
      this.style.display = 'none';
      return;
    }

    const field = this.#form.getField(this.#fieldName);
    if (!field) {
      this.style.display = 'none';
      return;
    }

    const inp = field.input as unknown as {
      isFocus: boolean;
      isValid: boolean;
      errors: IFieldError[];
      guides: IFieldGuide[];
    };

    const focused = this.#getIsFocused();
    const errors: IFieldError[] = inp.errors ?? [];
    const guides: IFieldGuide[] = inp.guides ?? [];

    this.#contentPart.innerHTML = '';

    if (focused && errors.length > 0 && guides.length > 0) {
      this.style.display = 'block';
      this.style.color = '#38bdf8';
      guides.forEach(g => {
        const p = document.createElement('p');
        p.textContent = g.message ?? g.code;
        this.#contentPart!.appendChild(p);
      });
      return;
    }

    if (errors.length > 0) {
      this.style.display = 'block';
      this.style.color = '#f87171';
      errors.forEach(e => {
        const p = document.createElement('p');
        p.textContent = e.message ?? e.code;
        this.#contentPart!.appendChild(p);
      });
      return;
    }

    this.style.display = 'none';
  }
}

if (!customElements.get('atp-field-guide')) {
  customElements.define('atp-field-guide', AtpFieldGuide);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-field-guide': AtpFieldGuide;
  }
}
