import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

export interface FormularDropdownOption {
  readonly value: string;
  readonly label: string;
}

const template = document.createElement('template');
template.innerHTML = `
  <atp-field-set>
    <label slot="label"></label>
    <select slot="input"></select>
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
`;

export class AtpFormularDropdown extends HTMLElement {
  #form: IFormular<IObjectShape> | null = null;
  #options: FormularDropdownOption[] = [];
  #select!: HTMLSelectElement;
  #validation!: AtpValidationResult;
  #labelEl!: HTMLLabelElement;

  static get observedAttributes() {
    return ['field-name', 'label', 'guide', 'placeholder'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    
    this.#select = shadow.querySelector('select')!;
    this.#validation = shadow.querySelector('atp-validation-result')!;
    this.#labelEl = shadow.querySelector('label')!;

    this.#select.style.cssText = [
      'width:100%',
      'box-sizing:border-box',
      'padding:0 8px',
      'height:var(--vbs-control-height, 28px)',
      'background:var(--vbs-bg-input, #09090b)',
      'border:1px solid var(--vbs-border, #27272a)',
      'border-radius:var(--vbs-radius, 2px)',
      'color:var(--vbs-text-primary, #f4f4f5)',
      'font-size:13px',
      'outline:none',
      'transition:all 0.15s ease'
    ].join(';');

    this.#select.addEventListener('focus', () => {
      this.#select.style.borderColor = 'var(--vbs-primary, #3b82f6)';
      this.#select.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.4)';
    });

    this.#select.addEventListener('blur', () => {
      this.#select.style.borderColor = 'var(--vbs-border, #27272a)';
      this.#select.style.boxShadow = 'none';
    });

    
    
    
  }

  connectedCallback() {
    this.#select.addEventListener('focus', this.#onFocus);
    this.#select.addEventListener('blur', this.#onBlur);
    this.#select.addEventListener('change', this.#onChange);
    this.#renderOptions();
  }

  disconnectedCallback() {
    this.#select.removeEventListener('focus', this.#onFocus);
    this.#select.removeEventListener('blur', this.#onBlur);
    this.#select.removeEventListener('change', this.#onChange);
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    
    if (name === 'field-name') {
      this.#labelEl.htmlFor = newVal || '';
      this.#validation.fieldName = newVal;
      this.#select.id = newVal || '';
      this.#syncValue();
    } else if (name === 'label') {
      this.#labelEl.textContent = newVal || '';
    } else if (name === 'guide') {
      this.#validation.guideText = newVal;
    } else if (name === 'placeholder') {
      this.#renderOptions();
    }
  }

  #syncValue() {
    if (!this.#form || !this.fieldName) return;
    const fieldObj = this.#form.getField(this.fieldName);
    if (fieldObj) {
      const val = (fieldObj.input as any).value;
      if (val != null) this.#select.value = String(val);
    }
  }

  #renderOptions() {
    this.#select.innerHTML = '';
    const placeholder = this.getAttribute('placeholder');
    if (placeholder) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = placeholder;
      opt.hidden = true;
      opt.disabled = true;
      opt.selected = true;
      this.#select.appendChild(opt);
    }
    for (const option of this.#options) {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      this.#select.appendChild(opt);
    }
    this.#syncValue();
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

  #onChange = (e: Event) => {
    if (!this.#form || !this.fieldName) return;
    const target = e.target as HTMLSelectElement;
    this.#form.updateField(this.fieldName, target.value as InputDataTypes);
  }

  get form(): IFormular<IObjectShape> | null { return this.#form; }
  set form(f: IFormular<IObjectShape> | null) {
    this.#form = f;
    this.#validation.form = f;
    this.#syncValue();
  }

  get options(): FormularDropdownOption[] { return this.#options; }
  set options(opts: FormularDropdownOption[]) {
    this.#options = opts;
    this.#renderOptions();
  }

  get fieldName(): string { return this.getAttribute('field-name') || ''; }
  set fieldName(val: string) { this.setAttribute('field-name', val); }

  get label(): string { return this.getAttribute('label') || ''; }
  set label(val: string) { this.setAttribute('label', val); }

  get guide(): string { return this.getAttribute('guide') || ''; }
  set guide(val: string) { this.setAttribute('guide', val); }

  get placeholder(): string { return this.getAttribute('placeholder') || ''; }
  set placeholder(val: string) { this.setAttribute('placeholder', val); }
}

if (!customElements.get('atp-formular-dropdown')) {
  customElements.define('atp-formular-dropdown', AtpFormularDropdown);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-formular-dropdown': AtpFormularDropdown;
  }
}
