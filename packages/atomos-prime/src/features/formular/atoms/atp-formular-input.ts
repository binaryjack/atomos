import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

const template = document.createElement('template');
template.innerHTML = `
  <atp-field-set>
    <label slot="label"></label>
    <input slot="input" />
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
`;

export class AtpFormularInput extends HTMLElement {
  #form: IFormular<IObjectShape> | null = null;
  #input!: HTMLInputElement;
  #validation!: AtpValidationResult;
  #labelEl!: HTMLLabelElement;

  static get observedAttributes() {
    return ['field-name', 'label', 'guide', 'placeholder', 'type'];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
    
    this.#input = shadow.querySelector('input')!;
    this.#validation = shadow.querySelector('atp-validation-result')!;
    this.#labelEl = shadow.querySelector('label')!;

    
    
    
  }

  connectedCallback() {
    this.#input.addEventListener('focus', this.#onFocus);
    this.#input.addEventListener('blur', this.#onBlur);
    this.#input.addEventListener('input', this.#onInput);
    this.#updateStyles();
  }

  disconnectedCallback() {
    this.#input.removeEventListener('focus', this.#onFocus);
    this.#input.removeEventListener('blur', this.#onBlur);
    this.#input.removeEventListener('input', this.#onInput);
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
    } else if (name === 'placeholder') {
      this.#input.placeholder = newVal || '';
    } else if (name === 'type') {
      this.#input.type = newVal || 'text';
      this.#updateStyles();
    }
  }

  #updateStyles() {
    const type = this.getAttribute('type') || 'text';
    this.#input.style.cssText = [
      'width:100%',
      'box-sizing:border-box',
      type === 'color' ? 'padding:2px; cursor:pointer;' : 'padding:0 8px;',
      'height:var(--vbs-control-height, 28px)',
      'background:var(--vbs-bg-input, #09090b)',
      'border:1px solid var(--vbs-border, #27272a)',
      'border-radius:var(--vbs-radius, 2px)',
      'color:var(--vbs-text-primary, #f4f4f5)',
      'font-size:13px',
      'outline:none',
      'transition:all 0.15s ease',
    ].join(';');

    this.#input.addEventListener('focus', () => {
      this.#input.style.borderColor = 'var(--vbs-primary, #3b82f6)';
      this.#input.style.boxShadow = '0 0 0 1px rgba(59, 130, 246, 0.4)';
    });

    this.#input.addEventListener('blur', () => {
      this.#input.style.borderColor = 'var(--vbs-border, #27272a)';
      this.#input.style.boxShadow = 'none';
    });
  }

  #syncValue() {
    if (!this.#form || !this.fieldName) return;
    const fieldObj = this.#form.getField(this.fieldName);
    if (fieldObj) {
      const val = (fieldObj.input as any).value;
      if (val != null) this.#input.value = String(val);
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
    const target = e.target as HTMLInputElement;
    let val: string | number = target.value;
    if (this.getAttribute('type') === 'number' && val !== '') {
      val = Number(val);
    }
    this.#form.updateField(this.fieldName, val as InputDataTypes);
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

  get type(): string { return this.getAttribute('type') || 'text'; }
  set type(val: string) { this.setAttribute('type', val); }
}

if (!customElements.get('atp-formular-input')) {
  customElements.define('atp-formular-input', AtpFormularInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-formular-input': AtpFormularInput;
  }
}
