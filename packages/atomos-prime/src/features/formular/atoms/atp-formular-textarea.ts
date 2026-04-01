import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

const template = document.createElement('template');
template.innerHTML = `
  <atp-field-set>
    <label slot="label"></label>
    <textarea slot="input"></textarea>
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
`;

export class AtpFormularTextarea extends HTMLElement {
  #form: IFormular<IObjectShape> | null = null;
  #textarea!: HTMLTextAreaElement;
  #validation!: AtpValidationResult;
  #labelEl!: HTMLLabelElement;

  static get observedAttributes() {
    return ['field-name', 'label', 'guide', 'placeholder', 'rows'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    
    this.#textarea = shadow.querySelector('textarea')!;
    this.#validation = shadow.querySelector('atp-validation-result')!;
    this.#labelEl = shadow.querySelector('label')!;

    this.#textarea.style.cssText = [
      'width:100%',
      'box-sizing:border-box',
      'padding:8px 12px',
      'background:#1e293b',
      'border:1px solid #334155',
      'border-radius:6px',
      'color:#f1f5f9',
      'font-size:14px',
      'outline:none',
      'font-family: inherit',
      'resize: vertical'
    ].join(';');

    
    
    
  }

  connectedCallback() {
    this.#textarea.addEventListener('focus', this.#onFocus);
    this.#textarea.addEventListener('blur', this.#onBlur);
    this.#textarea.addEventListener('input', this.#onInput);
  }

  disconnectedCallback() {
    this.#textarea.removeEventListener('focus', this.#onFocus);
    this.#textarea.removeEventListener('blur', this.#onBlur);
    this.#textarea.removeEventListener('input', this.#onInput);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    
    if (name === 'field-name') {
      this.#labelEl.htmlFor = newVal || '';
      this.#validation.fieldName = newVal;
      this.#textarea.id = newVal || '';
      this.#syncValue();
    } else if (name === 'label') {
      this.#labelEl.textContent = newVal || '';
    } else if (name === 'guide') {
      this.#validation.guideText = newVal;
    } else if (name === 'placeholder') {
      this.#textarea.placeholder = newVal || '';
    } else if (name === 'rows') {
      if (newVal) this.#textarea.rows = parseInt(newVal, 10);
    }
  }

  #syncValue() {
    if (!this.#form || !this.fieldName) return;
    const fieldObj = this.#form.getField(this.fieldName);
    if (fieldObj) {
      const val = (fieldObj.input as any).value;
      if (val != null) this.#textarea.value = String(val);
    }
  }

  #onFocus = (e?: Event) => {
    this.#validation.setFocused(true);
  }

  #onBlur = (e?: Event) => {
    if (!this.#form || !this.fieldName) {
      this.#validation.setFocused(false);
      return;
    }
    const fld = this.#form.getField(this.fieldName);
    const afterValidate = () => this.#validation.setFocused(false);
    
    if (fld) {
      (fld.input as any)
        .handleValidationAsync(newEvent(this.fieldName, 'vbs', EventsEnum.onBlur, 'blur', this.fieldName, fld))
        .then(afterValidate)
        .catch(afterValidate);
    } else {
      afterValidate();
    }
  }

  #onInput(e: Event) {
    if (!this.#form || !this.fieldName) return;
    const target = e.target as HTMLTextAreaElement;
    this.#form.updateField(this.fieldName, target.value as InputDataTypes);
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

  get placeholder(): string { return this.getAttribute('placeholder') || ''; }
  set placeholder(val: string) { this.setAttribute('placeholder', val); }

  get rows(): number { return parseInt(this.getAttribute('rows') || '3', 10); }
  set rows(val: number) { this.setAttribute('rows', val.toString()); }
}

if (!customElements.get('atp-formular-textarea')) {
  customElements.define('atp-formular-textarea', AtpFormularTextarea);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-formular-textarea': AtpFormularTextarea;
  }
}
