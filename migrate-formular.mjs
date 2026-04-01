import { writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';

const SRC = 'd:/Sources/vbe2/packages/atomos-prime/src/features/formular';

const files = {
  'atp-field-set.ts': `const template = document.createElement('template');
template.innerHTML = \`<style>
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
<slot name="validation"></slot>\`;

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
`,

  'atp-validation-result.ts': `import type { IFormular, IObjectShape, IValidationResult } from '@binaryjack/formular.dev';

const template = document.createElement('template');
template.innerHTML = \`<style>
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
<div id="content"></div>\`;

export class AtpValidationResult extends HTMLElement {
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
      if (this.#guideText) {
        this.style.display = 'block';
        this.style.color = '#38bdf8';
        const p = document.createElement('p');
        p.textContent = this.#guideText;
        this.#contentPart.appendChild(p);
      } else if (failed.length > 0) {
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

if (!customElements.get('atp-validation-result')) {
  customElements.define('atp-validation-result', AtpValidationResult);
}

declare global {
  interface HTMLElementTagNameMap {
    'atp-validation-result': AtpValidationResult;
  }
}
`,

  'atp-field-guide.ts': `import type { IFieldError, IFieldGuide, IFormular, IObjectShape } from '@binaryjack/formular.dev';

const template = document.createElement('template');
template.innerHTML = \`<style>
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
<div id="content"></div>\`;

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
`,

  'atoms/atp-formular-input.ts': `import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

const template = document.createElement('template');
template.innerHTML = \`
  <atp-field-set>
    <label slot="label"></label>
    <input slot="input" />
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
\`;

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

    this.#onFocus = this.#onFocus.bind(this);
    this.#onBlur = this.#onBlur.bind(this);
    this.#onInput = this.#onInput.bind(this);
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
      type === 'color' ? 'padding:2px; height:38px; cursor:pointer;' : 'padding:8px 12px;',
      'background:#1e293b',
      'border:1px solid #334155',
      'border-radius:6px',
      'color:#f1f5f9',
      'font-size:14px',
      'outline:none',
      'transition:border-color 0.15s',
    ].join(';');
  }

  #syncValue() {
    if (!this.#form || !this.fieldName) return;
    const fieldObj = this.#form.getField(this.fieldName);
    if (fieldObj) {
      const val = (fieldObj.input as any).value;
      if (val != null) this.#input.value = String(val);
    }
  }

  #onFocus() {
    this.#validation.setFocused(true);
  }

  #onBlur() {
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
`,

  'atoms/atp-formular-dropdown.ts': `import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

export interface FormularDropdownOption {
  readonly value: string;
  readonly label: string;
}

const template = document.createElement('template');
template.innerHTML = \`
  <atp-field-set>
    <label slot="label"></label>
    <select slot="input"></select>
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
\`;

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
      'padding:8px 12px',
      'background:#1e293b',
      'border:1px solid #334155',
      'border-radius:6px',
      'color:#f1f5f9',
      'font-size:14px',
      'outline:none',
    ].join(';');

    this.#onFocus = this.#onFocus.bind(this);
    this.#onBlur = this.#onBlur.bind(this);
    this.#onChange = this.#onChange.bind(this);
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

  #onFocus() {
    this.#validation.setFocused(true);
  }

  #onBlur() {
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

  #onChange(e: Event) {
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
`,

  'atoms/atp-formular-checkbox.ts': `import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

const template = document.createElement('template');
template.innerHTML = \`
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
\`;

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

    this.#onFocus = this.#onFocus.bind(this);
    this.#onBlur = this.#onBlur.bind(this);
    this.#onChange = this.#onChange.bind(this);
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

  #onFocus() {
    this.#validation.setFocused(true);
  }

  #onBlur() {
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
`,

  'atoms/atp-formular-textarea.ts': `import type { InputDataTypes, IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import '../atp-field-set.js';
import '../atp-validation-result.js';
import type { AtpValidationResult } from '../atp-validation-result.js';

const template = document.createElement('template');
template.innerHTML = \`
  <atp-field-set>
    <label slot="label"></label>
    <textarea slot="input"></textarea>
    <atp-validation-result slot="validation"></atp-validation-result>
  </atp-field-set>
\`;

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

    this.#onFocus = this.#onFocus.bind(this);
    this.#onBlur = this.#onBlur.bind(this);
    this.#onInput = this.#onInput.bind(this);
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

  #onFocus() {
    this.#validation.setFocused(true);
  }

  #onBlur() {
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
`,

  'index.ts': `export { AtpFieldGuide } from './atp-field-guide.js';
export { AtpValidationResult } from './atp-validation-result.js';
export { AtpFieldSet } from './atp-field-set.js';

export { AtpFormularInput } from './atoms/atp-formular-input.js';
export { AtpFormularDropdown } from './atoms/atp-formular-dropdown.js';
export type { FormularDropdownOption } from './atoms/atp-formular-dropdown.js';
export { AtpFormularCheckbox } from './atoms/atp-formular-checkbox.js';
export { AtpFormularTextarea } from './atoms/atp-formular-textarea.js';
`
};

for (const [file, content] of Object.entries(files)) {
  writeFileSync(join(SRC, file), content);
}

// Remove old ones
const oldFiles = [
  'create-field-guide.ts',
  'vbs-field-set.ts',
  'vbs-validation-result.ts',
  'atoms/create-formular-input.ts',
  'atoms/create-formular-textarea.ts',
  'atoms/create-formular-dropdown.ts',
  'atoms/create-formular-checkbox.ts'
];
for (const file of oldFiles) {
  try {
    unlinkSync(join(SRC, file));
  } catch (e) {}
}

console.log("Migration done");
