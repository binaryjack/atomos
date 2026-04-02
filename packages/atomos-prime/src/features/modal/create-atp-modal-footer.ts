export const createAtpModalFooter = () => {
    if (customElements.get('atp-modal-footer')) return;

    const footerTemplate = document.createElement('template');
    footerTemplate.innerHTML = `
    <style>
      :host {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 20px;
        border-top: 1px solid var(--vbs-border, #27272a);
        flex-shrink: 0;
      }
    </style>
    <slot></slot>
    `;

    class AtpModalFooter extends HTMLElement {
        constructor() {
            super();
            const shadow = this.attachShadow({ mode: 'open' });
            shadow.appendChild(footerTemplate.content.cloneNode(true));
        }
    }

    customElements.define('atp-modal-footer', AtpModalFooter);
};
