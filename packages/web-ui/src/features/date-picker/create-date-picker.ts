import { createSignal } from '../../core/create-signal.js';
import type { Signal } from '../../core/types/signal.types.js';
import { DateFormatsEnum, formatDate } from './date-utils.js';
import type { DpDrawerResult } from './dp-drawer.js';
import { createDpDrawer } from './dp-drawer.js';
import type { DatePickerSelectionModeType } from './types/date-picker.types.js';

export interface DatePickerProps {
  name?:          string;
  placeholder?:   string;
  format?:        DateFormatsEnum;
  selectionMode?: DatePickerSelectionModeType;
  value?:         string | Signal<string>;
  disabled?:      boolean | Signal<boolean>;
  minDate?:       Date;
  maxDate?:       Date;
  onChange?:      (value: string, date: Date) => void;
  onRangeChange?: (from: string, to: string, start: Date, end: Date) => void;
  className?:     string;
}

export interface DatePickerResult {
  element:   HTMLDivElement;
  getValue:  () => string;
  setValue:  (iso: string) => void;
  clear:     () => void;
  cleanup:   { destroy(): void };
}

export const createDatePicker = function(props: DatePickerProps = {}): DatePickerResult {
  const fmt            = props.format        ?? DateFormatsEnum.DD_MM_YYYY;
  const selectionMode  = props.selectionMode ?? 'single';
  const isDisabledSig  = typeof props.disabled === 'object'
    ? props.disabled
    : createSignal<boolean>(props.disabled ?? false);

  const valueSig: Signal<string> = typeof props.value === 'object'
    ? props.value
    : createSignal<string>(typeof props.value === 'string' ? props.value : '');

  // ── wrapper ──────────────────────────────────────────────────────────────
  const wrapper = document.createElement('div');
  wrapper.className = ['dp-wrapper', 'relative', 'inline-flex', 'flex-col', props.className ?? '']
    .filter(Boolean).join(' ');

  // ── input row ─────────────────────────────────────────────────────────────
  const inputRow = document.createElement('div');
  inputRow.className = 'dp-input-row flex items-center gap-1';

  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.placeholder = props.placeholder ?? fmt;
  if (props.name) input.name = props.name;
  input.className = [
    'dp-input', 'flex-1', 'px-3', 'py-2', 'border', 'border-gray-300',
    'rounded-lg', 'text-sm', 'bg-white', 'cursor-pointer',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-400',
    'disabled:opacity-50', 'disabled:cursor-not-allowed',
  ].join(' ');

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = '×';
  clearBtn.setAttribute('aria-label', 'Clear date');
  clearBtn.className = [
    'dp-clear', 'w-6', 'h-6', 'rounded', 'text-gray-400',
    'hover:text-gray-600', 'hover:bg-gray-100',
    'flex', 'items-center', 'justify-center', 'text-base',
    'focus:outline-none', 'hidden',
  ].join(' ');

  const calIcon = document.createElement('button');
  calIcon.type = 'button';
  calIcon.setAttribute('aria-label', 'Open calendar');
  calIcon.innerHTML = '📅';
  calIcon.className = [
    'dp-icon', 'w-8', 'h-8', 'rounded', 'hover:bg-gray-100',
    'flex', 'items-center', 'justify-center', 'text-sm',
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-400',
  ].join(' ');

  inputRow.appendChild(input);
  inputRow.appendChild(clearBtn);
  inputRow.appendChild(calIcon);
  wrapper.appendChild(inputRow);

  // ── value range label (range mode) ───────────────────────────────────────
  let rangeLabel: HTMLDivElement | null = null;
  if (selectionMode === 'range') {
    rangeLabel = document.createElement('div');
    rangeLabel.className = 'dp-range-label text-xs text-gray-500 mt-1 hidden';
    wrapper.appendChild(rangeLabel);
  }

  // ── drawer ────────────────────────────────────────────────────────────────
  let drawer: DpDrawerResult | null = null;
  const unsubs: (() => void)[] = [];

  const initDrawer = (): void => {
    if (drawer) return;
    drawer = createDpDrawer({
      anchor:        calIcon,
      selectionMode,
      format:        fmt,
      ...(props.minDate !== undefined && { minDate: props.minDate }),
      ...(props.maxDate !== undefined && { maxDate: props.maxDate }),
      disabled: isDisabledSig.value,

      onSelect(ts, date) {
        const str = formatDate(date, fmt);
        valueSig.set(str);
        input.value = str;
        clearBtn.classList.remove('hidden');
        props.onChange?.(str, date);
      },

      onRangeSelect(start, end) {
        const s = formatDate(start, fmt);
        const e = formatDate(end,   fmt);
        const combined = `${s} → ${e}`;
        input.value = combined;
        if (rangeLabel) {
          rangeLabel.textContent = combined;
          rangeLabel.classList.remove('hidden');
        }
        clearBtn.classList.remove('hidden');
        props.onRangeChange?.(s, e, start, end);
      },
    });
  };

  const openPicker = (): void => {
    if (isDisabledSig.value) return;
    initDrawer();
    drawer?.toggle();
  };

  input.addEventListener('click', openPicker);
  calIcon.addEventListener('click', openPicker);

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    valueSig.set('');
    input.value = '';
    clearBtn.classList.add('hidden');
    if (rangeLabel) {
      rangeLabel.textContent = '';
      rangeLabel.classList.add('hidden');
    }
    drawer?.close();
  });

  // sync external value signal
  unsubs.push(valueSig.subscribe((v) => {
    if (input.value !== v) input.value = v;
    if (v) clearBtn.classList.remove('hidden');
    else   clearBtn.classList.add('hidden');
  }));

  // sync disabled
  unsubs.push(isDisabledSig.subscribe((disabled) => {
    input.disabled   = disabled;
    calIcon.disabled = disabled;
  }));

  // init value
  if (valueSig.value) {
    input.value = valueSig.value;
    clearBtn.classList.remove('hidden');
  }

  // ── result ────────────────────────────────────────────────────────────────
  return {
    element:  wrapper,
    getValue: () => valueSig.value,
    setValue: (str: string) => {
      valueSig.set(str);
    },
    clear: () => {
      valueSig.set('');
      input.value = '';
      clearBtn.classList.add('hidden');
      drawer?.close();
    },
    cleanup: {
      destroy() {
        for (const u of unsubs) u();
        input.removeEventListener('click', openPicker);
        calIcon.removeEventListener('click', openPicker);
        drawer?.destroy();
        drawer = null;
      },
    },
  };
};

// ─── Web Component ────────────────────────────────────────────────────────────

const ATTR_FORMAT    = 'format';
const ATTR_MODE      = 'selection-mode';
const ATTR_VALUE     = 'value';
const ATTR_DISABLED  = 'disabled';
const ATTR_PLACEHOLDER = 'placeholder';
const ATTR_NAME      = 'name';

export class VbsDatePicker extends HTMLElement {
  static get observedAttributes(): string[] {
    return [ATTR_FORMAT, ATTR_MODE, ATTR_VALUE, ATTR_DISABLED, ATTR_PLACEHOLDER, ATTR_NAME];
  }

  #result:  DatePickerResult | null = null;
  #valueSig = createSignal<string>('');
  #disabledSig = createSignal<boolean>(false);

  // --- Property Reflection ---
  get format(): string {
    return this.getAttribute(ATTR_FORMAT) ?? DateFormatsEnum.DD_MM_YYYY;
  }
  set format(val: string) {
    this.setAttribute(ATTR_FORMAT, val);
  }

  get selectionMode(): string {
    return this.getAttribute(ATTR_MODE) ?? 'single';
  }
  set selectionMode(val: string) {
    this.setAttribute(ATTR_MODE, val);
  }

  get value(): string {
    return this.getAttribute(ATTR_VALUE) ?? '';
  }
  set value(val: string) {
    this.setAttribute(ATTR_VALUE, val);
  }

  get disabled(): boolean {
    return this.hasAttribute(ATTR_DISABLED);
  }
  set disabled(val: boolean) {
    if (val) this.setAttribute(ATTR_DISABLED, '');
    else this.removeAttribute(ATTR_DISABLED);
  }

  get placeholder(): string {
    return this.getAttribute(ATTR_PLACEHOLDER) ?? '';
  }
  set placeholder(val: string) {
    this.setAttribute(ATTR_PLACEHOLDER, val);
  }

  get name(): string {
    return this.getAttribute(ATTR_NAME) ?? '';
  }
  set name(val: string) {
    this.setAttribute(ATTR_NAME, val);
  }
  // ---------------------------

  connectedCallback(): void {
    if (this.#result) return; // Prevent multiple initializations

    const format = (this.getAttribute(ATTR_FORMAT) ?? DateFormatsEnum.DD_MM_YYYY) as DateFormatsEnum;
    const mode   = (this.getAttribute(ATTR_MODE)   ?? 'single') as DatePickerSelectionModeType;
    const ph     = this.getAttribute(ATTR_PLACEHOLDER) ?? undefined;
    const name   = this.getAttribute(ATTR_NAME)   ?? undefined;

    if (this.hasAttribute(ATTR_VALUE)) this.#valueSig.set(this.getAttribute(ATTR_VALUE) ?? '');
    this.#disabledSig.set(this.hasAttribute(ATTR_DISABLED));

    this.#result = createDatePicker({
      format,
      selectionMode: mode,
      value:    this.#valueSig,
      disabled: this.#disabledSig,
      ...(ph   !== undefined && { placeholder: ph }),
      ...(name !== undefined && { name }),
      onChange: (value, date) => {
        if (this.getAttribute(ATTR_VALUE) !== value) {
          this.setAttribute(ATTR_VALUE, value);
        }
        this.dispatchEvent(new CustomEvent('change', { detail: { value, date }, bubbles: true }));
      },
    });

    this.appendChild(this.#result.element);
  }

  disconnectedCallback(): void {
    this.#result?.cleanup.destroy();
    this.#result = null;
  }

  attributeChangedCallback(name: string, _old: string | null, next: string | null): void {
    if (!this.#result) return; // if not initialized yet, signals will pick it up on connect
    if (name === ATTR_VALUE)    this.#valueSig.set(next ?? '');
    if (name === ATTR_DISABLED) this.#disabledSig.set(next !== null);
  }
}

if (!customElements.get('vbs-date-picker')) {
  customElements.define('vbs-date-picker', VbsDatePicker);
}
