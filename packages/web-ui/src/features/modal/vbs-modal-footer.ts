const footerTemplate = document.createElement('template');
footerTemplate.innerHTML = `
<style>
  :host {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid #334155;
    flex-shrink: 0;
  }
</style>
<slot></slot>
`;

/**
 * <vbs-modal-footer>
 *   <button>Cancel</button>
 *   <button>Save</button>
 * </vbs-modal-footer>
 *
 * Pure layout component — right-aligns action buttons.
 * No logic; place any content (typically buttons) as children.
 *
 * Usage:
 *   <vbs-modal-footer slot="footer">
 *     <button>Cancel</button>
 *     <button>Confirm</button>
 *   </vbs-modal-footer>
 */
export class VbsModalFooter extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(footerTemplate.content.cloneNode(true));
  }
}
