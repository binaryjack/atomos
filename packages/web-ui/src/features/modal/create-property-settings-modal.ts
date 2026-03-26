import './vbs-modal.js';
import './vbs-modal-header.js';
import './vbs-modal-footer.js';
import type { VbsModal } from './vbs-modal.js';

export const createPropertySettingsModal = function(propertyId: string): VbsModal {
  const modal = document.createElement('vbs-modal') as VbsModal;
  modal.style.setProperty('--vbs-modal-width', '420px');

  const header = document.createElement('vbs-modal-header');
  header.textContent = 'Property Settings';
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.style.cssText = 'color:#94a3b8;font-size:13px;';
  body.textContent = `Settings for property ${propertyId} — coming soon.`;

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'padding:6px 16px;border-radius:6px;background:#475569;color:#e2e8f0;border:none;cursor:pointer;font-size:14px;';
  closeBtn.addEventListener('click', () => modal.close());
  footer.appendChild(closeBtn);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  document.body.appendChild(modal);
  return modal;
};
