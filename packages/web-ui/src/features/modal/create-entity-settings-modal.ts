import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { f } from '@binaryjack/formular.dev'
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js'
import { createFormularManager } from '../../core/create-formular-manager.js'
import { createButton } from '../button/create-button.js'
import { createFormularInput } from '../formular/atoms/create-formular-input.js'
import './index.js'
import type { ModalOptions } from './types/modal-options.types.js'
import type { ModalResult } from './types/modal-result.types.js'
import type { VbsModal } from './vbs-modal.js'

export const createEntitySettingsModal = function(entityId: string): VbsModal {
  const adapter = getCanvasAdapter();
  const initialEntity = adapter.getEntity(entityId);
  if (!initialEntity) throw new Error(`Entity ${entityId} not found`);

  const modal = document.createElement('vbs-modal') as VbsModal;
  modal.style.setProperty('--vbs-modal-width', '480px');

  let isInitialized = false;
  let currentForm: IFormular<IObjectShape> | null = null;
  let fieldCleanups: Array<() => void> = [];

  const formManager = createFormularManager();

  const header = document.createElement('vbs-modal-header');
  header.textContent = `Entity Settings`;
  header.setAttribute('slot', 'header');

  const body = document.createElement('div');
  body.className = 'flex flex-col gap-4 p-4';

  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  const initializeForm = async (preservedData?: any) => {
    const liveEntity = adapter.getEntity(entityId);
    if (!liveEntity) throw new Error(`Entity ${entityId} not found`);

    header.textContent = `Entity Settings`;

    body.innerHTML = '';
    footer.innerHTML = '';
    fieldCleanups.forEach(fn => fn());
    fieldCleanups = [];

    const schema = f.object({
      name: f.string().min(1, 'Name is required')
    });

    const form = await formManager.createFormForModal(modal, {
      schema,
      defaultValues: {
        name: preservedData?.name ?? liveEntity.name
      }
    });

    currentForm = form as unknown as IFormular<IObjectShape>;

    const nameField = createFormularInput({
      fieldName: 'name',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Entity Name',
      placeholder: 'Enter entity name'
    });

    body.appendChild(nameField.element);
    fieldCleanups.push(nameField.cleanup.destroy);

    const cancelBtn = createButton({
      variant: 'ghost',
      size: 'md',
      children: 'Cancel',
      onClick: () => {
        fieldCleanups.forEach(fn => fn());
        modal.close();
      }
    });

    const saveBtn = createButton({
      variant: 'primary',
      size: 'md',
      children: 'Save',
      onClick: async () => {
        if (!currentForm) return;

        let isValid = false;
        try {
          isValid = await currentForm.validateForm();
        } catch (err) {
          console.warn('Validation error:', err);
        }

        if (!isValid) return;

        let data: any = {};
        try {
          data = currentForm.getData() || {};
        } catch (err) {
          console.error('Error getting form data:', err);
        }

        const manualName = (currentForm.getField('name')?.input as any)?.value;
        const finalName = data.name || manualName || liveEntity.name;

        adapter.updateEntityName(entityId, finalName);

        fieldCleanups.forEach(fn => fn());
        formManager.cleanupModal(modal);
        modal.close();
      }
    });

    footer.appendChild(cancelBtn.element);
    footer.appendChild(saveBtn.element);
  };

  const originalOpen = modal.open.bind(modal);
  modal.open = async function<T = void>(options?: ModalOptions<T>): Promise<ModalResult<T>> {
    if (!isInitialized) {
      try {
        await initializeForm();
        isInitialized = true;
      } catch (error) {
        console.error('Failed to init form:', error);
        body.innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;"><p>Failed to initialize form</p></div>`;
      }
    }

    if (!modal.parentElement) {
      document.body.appendChild(modal);
    }
    return originalOpen(options);
  };

  modal.addEventListener('vbs-modal-closed', () => {
    formManager.cleanupModal(modal);
    fieldCleanups.forEach(fn => fn());
    fieldCleanups = [];
    isInitialized = false;
    currentForm = null;
    if (modal.parentElement) {
      modal.parentElement.removeChild(modal);
    }
  });

  document.body.appendChild(modal);
  return modal;
};
