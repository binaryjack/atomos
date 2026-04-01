import { animateClose, animateOpen } from './create-modal-animations.js';
import { modalStack } from './create-modal-stack.js';
import type { ModalOptions } from './types/modal-options.types.js';
import type { ModalResult } from './types/modal-result.types.js';

// â”€â”€â”€ Shadow DOM template â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const template = document.createElement('template');
template.innerHTML = `<style>
  :host { display: contents; }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.78);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }

  /* wrapper is pass-through: pointer-events: none â†’ clicks outside dialog hit the backdrop */
  .wrapper {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    pointer-events: none;
  }

  .dialog {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    width: var(--vbs-modal-width, 480px);
    max-width: 100%;
    max-height: 85vh;
    overflow: hidden;
    pointer-events: all;
    will-change: transform, opacity;
  }

  .body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    color: #cbd5e1;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }
  .body::-webkit-scrollbar { width: 6px; }
  .body::-webkit-scrollbar-track { background: transparent; }
  .body::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
</style>
<div class="backdrop" part="backdrop"></div>
<div class="wrapper" part="wrapper">
  <div class="dialog" role="dialog" aria-modal="true" part="dialog">
    <slot name="header"></slot>
    <div class="body" part="body"><slot></slot></div>
    <slot name="footer"></slot>
  </div>
</div>`;

// â”€â”€â”€ VbsModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * `<vbs-modal>` â€” agnostic dialog web component.
 *
 * ## Programmatic (returns Promise):
 * ```ts
 * const result = await modal.open<string>();
 * // result: { value: string | undefined, cancelled: boolean }
 * ```
 *
 * ## Declarative (attribute-driven + CustomEvent):
 * ```html
 * <vbs-modal id="my-modal">
 *   <vbs-modal-header slot="header">Title</vbs-modal-header>
 *   <p>Body content</p>
 *   <vbs-modal-footer slot="footer">â€¦buttonsâ€¦</vbs-modal-footer>
 * </vbs-modal>
 * ```
 * ```ts
 * modal.setAttribute('open', '');
 * modal.addEventListener('vbs-modal-closed', e => console.log(e.detail));
 * ```
 *
 * ## CSS custom properties:
 * - `--vbs-modal-width` (default: 480px)
 *
 * ## Stacking:
 * Multiple modals can be open simultaneously; each gets an incrementing z-index.
 * ESC always closes only the top-most modal.
 *
 * ## Click-outside:
 * Clicking the backdrop dismisses the top-most modal.
 */
export class VbsModal extends HTMLElement {
  static readonly observedAttributes = ['open'] as const;

  readonly #shadow: ShadowRoot;
  readonly #backdrop: HTMLElement;
  readonly #wrapper: HTMLElement;
  readonly #dialog: HTMLElement;

  #isOpen = false;
  #isAnimating = false;
  #resolve: ((r: ModalResult<unknown>) => void) | null = null;
  #previouslyFocused: HTMLElement | null = null;
  #focusTrapHandler: (e: KeyboardEvent) => void;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.appendChild(template.content.cloneNode(true));

    this.#backdrop = this.#shadow.querySelector('.backdrop') as HTMLElement;
    this.#wrapper  = this.#shadow.querySelector('.wrapper')  as HTMLElement;
    this.#dialog   = this.#shadow.querySelector('.dialog')   as HTMLElement;

    this.#focusTrapHandler = this.#trapFocus.bind(this);

    // Start hidden
    this.#setVisible(false);

    // Click-outside: backdrop sits beneath the wrapper; clicking outside the
    // dialog passes through the wrapper (pointer-events:none) and reaches the backdrop.
    this.#backdrop.addEventListener('click', () => {
      if (modalStack.isTop(this)) this.close();
    });
  }

  connectedCallback(): void {
    // Close requests bubbling from slotted children (e.g. header close button)
    this.addEventListener('vbs-modal-close-request', () => this.close());

    // Handle [open] attribute set before element was connected to the DOM
    if (this.hasAttribute('open') && !this.#isOpen) {
      this.#isOpen = true;
      void this.#doOpen();
    }
  }

  disconnectedCallback(): void {
    if (this.#isOpen) {
      this.#isOpen = false;
      modalStack.pop();
      this.#resolve?.({ value: undefined, cancelled: true });
      this.#resolve = null;
    }
  }

  // â”€â”€â”€ Attributes & Reflection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  
  get isOpen() {
    return this.hasAttribute('open');
  }

  set isOpen(value: boolean) {
    if (value) {
      if (!this.hasAttribute('open')) this.setAttribute('open', '');
    } else {
      if (this.hasAttribute('open')) this.removeAttribute('open');
    }
  }

  // Handles external setAttribute('open', '') / removeAttribute('open') calls
  attributeChangedCallback(
    name: string,
    _old: string | null,
    next: string | null,
  ): void {
    if (name !== 'open') return;
    // Only react when attribute is being added and we are NOT already handling it
    // from open() (open() sets #isOpen = true before setAttribute, so this guard fires).
    if (next !== null && !this.#isOpen) {
      this.#isOpen = true;
      void this.#doOpen();
    }
  }

  // â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Open the modal programmatically.
   * Returns a Promise that resolves with the result when the modal is closed.
   */
  open<T = void>(options: ModalOptions<T> = {}): Promise<ModalResult<T>> {
    return new Promise<ModalResult<T>>(resolve => {
      this.#resolve = (r: ModalResult<unknown>) => {
        options.onResult?.(r as ModalResult<T>);
        resolve(r as ModalResult<T>);
      };
      // Set flag BEFORE setAttribute so attributeChangedCallback skips
      if (!this.#isOpen) {
        this.#isOpen = true;
        this.setAttribute('open', '');
        void this.#doOpen();
      }
    });
  }

  /**
   * Close the modal.
   * Passing a value produces `{ value, cancelled: false }`.
   * Calling with no argument produces `{ value: undefined, cancelled: true }`.
   */
  close(value?: unknown): void {
    if (!this.#isOpen || this.#isAnimating) return;
    this.#isOpen = false;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    void this.#doClose({ value, cancelled: value === undefined });
  }
  // â”€â”€â”€ Private â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  #setVisible(visible: boolean): void {
    const d = visible ? 'block' : 'none';
    const f = visible ? 'flex' : 'none';
    this.#backdrop.style.display = d;
    this.#wrapper.style.display  = f;
  }

  #trapFocus(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    // Use querySelectorAll to find focusable elements inside the modal light dom
    const focusableElements = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const elements = Array.from(this.querySelectorAll(focusableElements)) as HTMLElement[];
    
    if (elements.length === 0) {
      e.preventDefault();
      return;
    }

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    if (!firstElement || !lastElement) return;

    // Shift + Tab
    if (e.shiftKey) {
      if (document.activeElement === firstElement || document.activeElement === this) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  async #doOpen(): Promise<void> {
    if (this.#isAnimating) return;
    this.#isAnimating = true;

    // Save initially focused element to restore later
    if (document.activeElement instanceof HTMLElement) {
      this.#previouslyFocused = document.activeElement;
    }

    const zIndex = modalStack.push(this);
    this.#backdrop.style.zIndex = String(zIndex - 1);
    this.#wrapper.style.zIndex  = String(zIndex);

    this.#setVisible(true);
    this.removeAttribute('aria-hidden');

    this.addEventListener('keydown', this.#focusTrapHandler);

    await animateOpen(this.#dialog, this.#backdrop);
    this.#isAnimating = false;

    // Move focus into the modal
    const focusable = this.querySelector('input, button, [tabindex]:not([tabindex="-1"])') as HTMLElement;
    if (focusable) {
      focusable.focus();
    } else {
      this.setAttribute('tabindex', '-1');
      this.focus();
    }

    this.dispatchEvent(new CustomEvent('vbs-modal-opened', { bubbles: false }));
  }

  async #doClose(result: ModalResult<unknown>): Promise<void> {
    this.#isAnimating = true;
    
    this.removeEventListener('keydown', this.#focusTrapHandler);

    await animateClose(this.#dialog, this.#backdrop);

    this.#setVisible(false);
    this.removeAttribute('open');
    this.setAttribute('aria-hidden', 'true');
    this.#isAnimating = false;

    modalStack.pop();

    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.(result);
    
    // Restore focus
    if (this.#previouslyFocused) {
      this.#previouslyFocused.focus();
      this.#previouslyFocused = null;
    }

    this.dispatchEvent(
      new CustomEvent('vbs-modal-closed', { bubbles: false, detail: result })
    );
  }
}

