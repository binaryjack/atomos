import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

const template = document.createElement('template');
template.innerHTML = `
  <atp-field-set>
    <label slot="label"></label>
    <div slot="input" class="checkbox-wrapper">
      <input type="checkbox" />
      <span class="check-label"></span>
    </div>
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
  <style>
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: #3b82f6;
      cursor: pointer;
    }
    .check-label {
      font-size: 14px;
      color: #e2e8f0;
    }
  </style>
`;

export class AtpFormularCheckbox extends HTMLElement {
  #form: IFormular<IObjectShape> | null = null;
  #input!: HTMLInputElement;
  #validation!: AtpValidationResult;
  #labelEl!: HTMLLabelElement;
  #checkLabelEl!: HTMLSpanElement;

  static get observedAttributes() {
    return ['field-name', 'label', 'guide', 'check-label'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    
    this.#input = shadow.querySelector('input')!;
    this.#validation = shadow.querySelector('atp-validation-result')!;
    this.#labelEl = shadow.querySelector('label')!;
    this.#checkLabelEl = shadow.querySelector('.check-label')!;

    
    
    
  }

  connectedCallback() {
    this.#input.addEventListener('focus', this.#onFocus);
    this.#input.addEventListener('blur', this.#onBlur);
    this.#input.addEventListener('change', this.#onChange);
  }

  disconnectedCallback() {
    this.#input.removeEventListener('focus', this.#onFocus);
    this.#input.removeEventListener('blur', this.#onBlur);
    this.#input.removeEventListener('change', this.#onChange);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    
    if (name === 'field-name') {
      this.#labelEl.htmlFor = newVal || '';
      this.#validation.fieldName = newVal;
      this.#input.id = newVal || '';
      this.#syncValue();
    } else if (name === 'label') {
      this.#labelEl.textContent = newVal || '';
    } else if (name === 'guide') {
      this.#validation.guideText = newVal;
    } else if (name === 'check-label') {
      this.#checkLabelEl.textContent = newVal || '';
    }
  }

  #syncValue() {
    if (!this.#form || !this.fieldName) return;
    const fieldObj = this.#form.getField(this.fieldName);
    if (fieldObj) {
      const val = (fieldObj.input as any).value;
      if (val != null) this.#input.checked = Boolean(val);
    }
  }

  #onFocus = (e?: Event) => {
    this.#validation.setFocused(true);
  }

  #onBlur = (e?: Event) => {
    this.#validation.setFocused(false);
  }

  #onChange(e: Event) {
    if (!this.#form || !this.fieldName) return;
    const target = e.target as HTMLInputElement;
    this.#form.updateField(this.fieldName, target.checked as InputDataTypes);
  }

  get form(): IFormular<IObjectShape> | null { return this.#form; }
  set form(f: IFormular<IObjectShape> | null) {
    this.#form = f;
    this.#validation.form = f;
    this.#syncValue();
  }

  get fieldName(): string { return this.getAttribute('field-name') || ''; }
  set fieldName(val: string) { this.setAttribute('field-name', val); }

  get label(): string { return this.getAttribute('label') || ''; }
  set label(val: string) { this.setAttribute('label', val); }

  get guide(): string { return this.getAttribute('guide') || ''; }
  set guide(val: string) { this.setAttribute('guide', val); }

  get checkLabel(): string { return this.getAttribute('check-label') || ''; }
  set checkLabel(val: string) { this.setAttribute('check-label', val); }
}

if (!customElements.get('atp-formular-checkbox')) {
  customElements.define('atp-formular-checkbox', AtpFormularCheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-formular-checkbox': AtpFormularCheckbox;
  }
}
