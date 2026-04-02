export const createAtpModalHeader = () => {
    if (customElements.get('atp-modal-header')) return;

    const headerTemplate = document.createElement('template');
    headerTemplate.innerHTML = `
    <style>
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--vbs-border, #27272a);
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
        color: var(--vbs-text-secondary, #a1a1aa);
        display: flex;
        align-items: center;
        border-radius: var(--vbs-radius, 2px);
        transition: color 150ms, background 150ms;
      }
      .close-btn:hover {
        color: #f1f5f9;
        background: var(--vbs-border, #27272a);
      }
    </style>
    <span class="title"><slot></slot></span>
    <button class="close-btn" type="button" aria-label="Close">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
    `;

    class AtpModalHeader extends HTMLElement {
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
                new CustomEvent('atp-modal-close-request', { bubbles: true, composed: true })
            );
        };
    }

    customElements.define('atp-modal-header', AtpModalHeader);
};
