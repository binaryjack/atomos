const headerTemplate = document.createElement('template');
headerTemplate.innerHTML = `
<style>
  :host {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid #334155;
    flex-shrink: 0;
    min-height: 52px;
  }
  .title {
    font-size: 16px;
    font-weight: 600;
    color: #f1f5f9;
    font-family: system-ui, sans-serif;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .close-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: color 150ms, background 150ms;
  }
  .close-btn:hover {
    color: #f1f5f9;
    background: #334155;
  }
</style>
<span class="title"><slot></slot></span>
<button class="close-btn" type="button" aria-label="Close">
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/>
  </svg>
</button>
`;

/**
 * <vbs-modal-header>My Title</vbs-modal-header>
 *
 * Renders the title text and a close (✕) button.
 * The close button dispatches `vbs-modal-close-request` (bubbles, composed)
 * which VbsModal catches to call close().
 *
 * Usage:
 *   <vbs-modal-header slot="header">Settings</vbs-modal-header>
 */
export class VbsModalHeader extends HTMLElement {
  #closeBtn: HTMLButtonElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(headerTemplate.content.cloneNode(true));
    this.#closeBtn = shadow.querySelector('.close-btn') as HTMLButtonElement;
  }

  connectedCallback(): void {
    this.#closeBtn.addEventListener('click', this.#onClick);
  }

  disconnectedCallback(): void {
    this.#closeBtn.removeEventListener('click', this.#onClick);
  }

  #onClick = (): void => {
    this.dispatchEvent(
      new CustomEvent('vbs-modal-close-request', { bubbles: true, composed: true })
    );
  };
}
