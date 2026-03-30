import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { f } from '@binaryjack/formular.dev'
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js'
import { createFormularManager } from '../../core/create-formular-manager.js'
import { createButton } from '../button/create-button.js'
import { createFormularCheckbox } from '../formular/atoms/create-formular-checkbox.js'
import { createFormularDropdown } from '../formular/atoms/create-formular-dropdown.js'
import { createFormularInput } from '../formular/atoms/create-formular-input.js'
import { createFormularTextarea } from '../formular/atoms/create-formular-textarea.js'
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

    const schemaShape: Record<string, any> = {
      name: f.string().min(1, 'Name is required'),
      description: f.string().optional(),
      shape: f.enum(['box', 'cylinder', 'actor', 'document', 'note']).optional(),
      color: f.string().optional()
    };
    
    // Dynamically build schema based on entity's properties
    liveEntity.properties.forEach(prop => {
      if (prop.dataType === 'boolean') {
        schemaShape[prop.key] = f.boolean();
      } else if (prop.dataType === 'number' || prop.dataType === 'integer' || prop.dataType === 'float') {
        schemaShape[prop.key] = f.number();
      } else {
        schemaShape[prop.key] = f.string();
      }
    });

    const schema = f.object(schemaShape);

    const defaultValues: Record<string, any> = {
      name: preservedData?.name ?? liveEntity.name,
      description: preservedData?.description ?? liveEntity.description ?? '',
      shape: preservedData?.shape ?? liveEntity.shape ?? 'box',
      color: preservedData?.color ?? liveEntity.color ?? '#1e293b'
    };
    
    liveEntity.properties.forEach(prop => {
      const fallback = prop.dataType === 'boolean' ? false : '';
      defaultValues[prop.key] = preservedData?.[prop.key] ?? prop.value ?? fallback;
    });

    const form = await formManager.createFormForModal(modal, {
      schema,
      defaultValues
    });

    currentForm = form as unknown as IFormular<IObjectShape>;

    const nameField = createFormularInput({
      fieldName: 'name',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Entity Name',
      placeholder: 'Enter entity name'
    });

    const descField = createFormularTextarea({
      fieldName: 'description',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Description',
      placeholder: 'Enter entity description'
    });

    const shapeField = createFormularDropdown({
      fieldName: 'shape',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Shape Type',
      options: [
        { label: 'Box', value: 'box' },
        { label: 'Database / Cylinder', value: 'cylinder' },
        { label: 'Actor', value: 'actor' },
        { label: 'Document', value: 'document' },
        { label: 'Note / Comment', value: 'note' }
      ]
    });

    const colorField = createFormularInput({
      fieldName: 'color',
      form: form as unknown as IFormular<IObjectShape>,
      label: 'Background Color',
      type: 'color'
    });

    body.appendChild(nameField.element);
    body.appendChild(descField.element);
    body.appendChild(shapeField.element);
    body.appendChild(colorField.element);
    
    fieldCleanups.push(
      nameField.cleanup.destroy, 
      descField.cleanup.destroy,
      shapeField.cleanup.destroy,
      colorField.cleanup.destroy
    );

    // Render property fields dynamically
    liveEntity.properties.forEach(prop => {
      let fieldResult;
      
      const fieldProps = {
        fieldName: prop.key,
        form: form as unknown as IFormular<IObjectShape>,
        label: prop.label || prop.key,
      };

      if (prop.dataType === 'boolean' || prop.componentType === 'checkbox') {
        fieldResult = createFormularCheckbox({ ...fieldProps });
      } else if (prop.componentType === 'textarea') {
        fieldResult = createFormularTextarea({ ...fieldProps, placeholder: 'Enter text' });
      } else if (prop.componentType === 'select') {
        // Need to know options, maybe from property if available, but fallback to empty for now
        fieldResult = createFormularDropdown({ 
          ...fieldProps, 
          options: [] // To be populated properly if options data exists
        });
      } else {
        fieldResult = createFormularInput({ ...fieldProps, placeholder: `Enter ${prop.label}` });
      }

      body.appendChild(fieldResult.element);
      fieldCleanups.push(fieldResult.cleanup.destroy);
    });

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
        const description = data.description !== undefined ? data.description : liveEntity.description;
        const shape = data.shape || liveEntity.shape;
        const color = data.color || liveEntity.color;

        adapter.updateEntityMetadata(entityId, { name: finalName, description, shape, color });
        
        const updatedProperties = liveEntity.properties.map(prop => ({
          ...prop,
          value: data[prop.key] !== undefined ? data[prop.key] : prop.value
        }));
        
        adapter.updateEntityProperties(entityId, updatedProperties);

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
