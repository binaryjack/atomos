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
      height: var(--vbs-control-height, 28px);
    }
    input[type="checkbox"] {
      appearance: none;
      width: 14px;
      height: 14px;
      background: var(--vbs-bg-input, #09090b);
      border: 1px solid var(--vbs-border, #27272a);
      border-radius: var(--vbs-radius, 2px);
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
      outline: none;
    }
    input[type="checkbox"]:focus-visible {
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.4);
    }
    input[type="checkbox"]:checked {
      background: var(--vbs-primary, #3b82f6);
      border-color: var(--vbs-primary, #3b82f6);
    }
    input[type="checkbox"]:checked::after {
      content: "";
      position: absolute;
      left: 3px; top: 1px;
      width: 4px; height: 8px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .check-label {
      font-size: 13px;
      color: var(--vbs-text-primary, #f4f4f5);
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

  #onChange = (e: Event) => {
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
