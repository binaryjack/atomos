import './index.js';
import type { VbsModal } from './vbs-modal.js';

const modalCache = new Map<string, VbsModal>();

export const openLinkSettingsModal = function(linkId: string): void {
  let modal = modalCache.get(linkId);
  if (!modal) {
    modal = document.createElement('vbs-modal') as VbsModal;
    modal.style.setProperty('--vbs-modal-width', '440px');

    const header = document.createElement('vbs-modal-header');
    header.textContent = 'Link Settings';
    header.setAttribute('slot', 'header');

    const body = document.createElement('div');
    body.style.cssText = 'color:#94a3b8;font-size:13px;';
    body.textContent = `Settings for link ${linkId} — coming soon.`;

    const footer = document.createElement('vbs-modal-footer');
    footer.setAttribute('slot', 'footer');
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding:6px 16px;border-radius:6px;background:#475569;color:#e2e8f0;border:none;cursor:pointer;font-size:14px;';
    closeBtn.addEventListener('click', () => modal!.close());
    footer.appendChild(closeBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    document.body.appendChild(modal);
    modalCache.set(linkId, modal);
  }
  modal.open().catch(console.error);
};
