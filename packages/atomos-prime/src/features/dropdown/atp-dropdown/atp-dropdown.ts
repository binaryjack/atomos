import { createAtpDropdownTemplate, attachAtpDropdownUI, type AtpDropdownDOM } from './ui/atp-dropdown-ui.js';
import type { DropdownOption } from '../types/dropdown.types.js';

const template = createAtpDropdownTemplate();

export class AtpDropdown extends HTMLElement {
    private dom!: AtpDropdownDOM;
    private _options: DropdownOption[] = [];

    static get observedAttributes() {
        return ['name', 'value', 'placeholder', 'disabled', 'class'];
    }

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        this.dom = attachAtpDropdownUI(shadow, template);
        
        this._onChange = this._onChange.bind(this);
        this._onFocus = this._onFocus.bind(this);
        this._onBlur = this._onBlur.bind(this);
    }

    connectedCallback() {
        this.dom.select.addEventListener('change', this._onChange);
        this.dom.select.addEventListener('focus', this._onFocus);
        this.dom.select.addEventListener('blur', this._onBlur);
        this.renderOptions();
    }

    disconnectedCallback() {
        this.dom.select.removeEventListener('change', this._onChange);
        this.dom.select.removeEventListener('focus', this._onFocus);
        this.dom.select.removeEventListener('blur', this._onBlur);
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;

        if (name === 'value') {
            this.dom.select.value = newValue || '';
        } else if (name === 'name') {
            this.dom.select.name = newValue || '';
        } else if (name === 'placeholder') {
            this.renderOptions();
        } else if (name === 'disabled') {
            this.dom.select.disabled = newValue !== null;
        }
    }

    private _onChange(e: Event) {
        // Reflect DOM value to component value
        if (this.getAttribute('value') !== this.dom.select.value) {
            this.setAttribute('value', this.dom.select.value);
        }
        
        // Dispatch custom change event that mirrors native select behavior
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }

    private _onFocus(e: Event) {
        this.dispatchEvent(new Event('focus', { bubbles: true, composed: true }));
    }

    private _onBlur(e: Event) {
        this.dispatchEvent(new Event('blur', { bubbles: true, composed: true }));
    }

    private renderOptions() {
        const select = this.dom.select;
        select.innerHTML = '';
        
        // Add placeholder if provided
        const placeholder = this.placeholder;
        if (placeholder) {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = placeholder;
            placeholderOption.disabled = true;
            placeholderOption.selected = !this.value; // Select if no value chosen
            select.appendChild(placeholderOption);
        }
        
        // Add options
        this._options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            optionElement.disabled = option.disabled || false;
            if (this.value === option.value) optionElement.selected = true;
            select.appendChild(optionElement);
        });
    }

    // --- Property Getters/Setters ---
    
    get options(): DropdownOption[] {
        return this._options;
    }

    set options(value: DropdownOption[]) {
        this._options = Array.isArray(value) ? value : [];
        this.renderOptions();
    }

    get value(): string {
        return this.getAttribute('value') || '';
    }

    set value(val: string) {
        this.setAttribute('value', val);
    }

    get name(): string {
        return this.getAttribute('name') || '';
    }

    set name(val: string) {
        this.setAttribute('name', val);
    }

    get disabled(): boolean {
        return this.hasAttribute('disabled');
    }

    set disabled(val: boolean) {
        if (val) this.setAttribute('disabled', '');
        else this.removeAttribute('disabled');
    }

    get placeholder(): string {
        return this.getAttribute('placeholder') || '';
    }

    set placeholder(val: string) {
        this.setAttribute('placeholder', val);
    }
}

export const defineAtpDropdown = () => {
    if (!customElements.get('atp-dropdown')) {
        customElements.define('atp-dropdown', AtpDropdown);
    }
};
