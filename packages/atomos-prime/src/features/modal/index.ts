export * from './atp-modal/atp-modal.js';
export * from './create-atp-modal-header.js';
export * from './create-atp-modal-footer.js';

export * from './create-modal-animations.js';
export * from './create-modal-demo.js';
export * from './create-modal-stack.js';
export * from './create-validation-badge.js';

export type { ModalOptions } from './types/modal-options.types.js';
export type { ModalResult } from './types/modal-result.types.js';
export type { ModalStackEntry } from './types/modal-stack-entry.types.js';

import { defineAtpModal, AtpModal } from './atp-modal/atp-modal.js';
import { createAtpModalHeader } from './create-atp-modal-header.js';
import { createAtpModalFooter } from './create-atp-modal-footer.js';

defineAtpModal();
createAtpModalHeader();
createAtpModalFooter();

declare global {
  interface HTMLElementTagNameMap {
    'atp-modal': AtpModal;
    'atp-modal-header': HTMLElement;
    'atp-modal-footer': HTMLElement;
  }
  interface HTMLElementEventMap {
    'atp-modal-opened': CustomEvent<void>;
    'atp-modal-closed': CustomEvent<import('./types/modal-result.types.js').ModalResult<unknown>>;
    'atp-modal-close-request': CustomEvent<void>;
  }
}
