import { AtpModal, defineAtpModal } from '../../../src/features/modal/atp-modal/atp-modal.js'
import { createButton } from '../../../src/index.js'
import type { DocDefinition } from '../types.js'

// Pre-register for docs
defineAtpModal();

export interface ModalState {
  title: string;
  hasFooter: boolean;
}

export const modalDoc: DocDefinition<ModalState> = {
  id: 'atp-modal',
  category: 'Overlays / Features',
  title: 'Modal Component',
  description: 'Native web component <atp-modal> acting as stacked, animated dialogs with focus trapping and built-in backdrop.',
  defaultState: {
    title: 'Confirm Action',
    hasFooter: true
  },
  controls: [
    { key: 'title', label: 'Modal Title', type: 'string' },
    { key: 'hasFooter', label: 'Show Footer Actions', type: 'boolean' }
  ],
  renderPreview: (state) => {
    const container = document.createElement('div');
    container.style.cssText = 'display:flex;flex-direction:column;gap:1rem;align-items:center;';

    // The trigger
    const trigger = createButton({ children: 'Open Modal', variant: 'primary' });
    container.appendChild(trigger.element);

    // The Modal
    const modalEl = document.createElement('atp-modal') as AtpModal;
    
    // Fill it with content
    const modalBody = document.createElement('div');
    modalBody.style.cssText = 'padding: 1.5rem; background: var(--vbs-bg-panel, #fff); color: var(--vbs-text-primary, #000); border-radius: 8px; width: 400px; max-width: 90vw; position: relative;';
    
    const title = document.createElement('h2');
    title.textContent = state.title;
    title.style.margin = '0 0 1rem 0';
    modalBody.appendChild(title);

    const text = document.createElement('p');
    text.textContent = 'This is an example dialog displaying the power of the ATP Modal. Focus is automatically trapped here while open.';
    modalBody.appendChild(text);

    if (state.hasFooter) {
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:0.5rem;margin-top:2rem;';
      
      const cancel = createButton({ children: 'Cancel', variant: 'ghost' });
      cancel.element.onclick = () => modalEl.close(false);
      
      const confirm = createButton({ children: 'Confirm', variant: 'primary' });
      confirm.element.onclick = () => modalEl.close(true);

      footer.appendChild(cancel.element);
      footer.appendChild(confirm.element);
      modalBody.appendChild(footer);
    } else {
      // Allow close clicking backdrop since no buttons
      const textHint = document.createElement('p');
      textHint.textContent = 'Click the dark backdrop or press Esc to close.';
      textHint.style.fontSize = '0.8rem';
      textHint.style.color = 'gray';
      modalBody.appendChild(textHint);
    }

    modalEl.appendChild(modalBody);
    container.appendChild(modalEl);

    // Bind event
    trigger.element.onclick = () => {
      modalEl.open().then(result => {
        console.log('Modal result:', result);
      });
    };

    return {
      element: container,
      cleanup: {
        destroy: () => {
          modalEl.remove();
          trigger.cleanup.destroy();
        }
      }
    };
  },
  renderCode: (state) => {
    return `import { defineAtpModal, AtpModal } from '@atomos-web/prime';

// Ensure the custom element is registered
defineAtpModal();

// 1. Create the modal element
const modal = document.createElement('atp-modal');

// 2. Add your content
modal.innerHTML = \`<div class="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-xl">
  <h2 class="text-xl font-bold mb-4">${state.title}</h2>
  <p>Your content here.</p>
  ${state.hasFooter ? '<div class="mt-6 flex justify-end gap-2"><button type="submit" class="btn primary">Confirm</button></div>' : ''}
</div>\`;

// 3. Append to body
document.body.appendChild(modal);

// 4. Open it! (returns a Promise resolving when closed)
modal.open().then(res => console.log('Closed!'));`;
  }
};