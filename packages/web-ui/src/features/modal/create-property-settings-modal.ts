import './index.js';
import type { VbsModal } from './vbs-modal.js';
import type { Property, DataType, Entity } from '@vbs/vbs-mod';
import type { IFormular, IObjectShape } from '@binaryjack/formular.dev';
import { createForm, f } from '@binaryjack/formular.dev';
import type { EntityStore } from '../../core/create-entity-store.js';
import type { IStorageProvider } from '../../core/storage/types/storage-provider.types.js';
import { createPropertyRepository } from '../../core/repository/create-property-repository.js';
import { createValidationModal } from './create-validation-modal.js';
import { createValidationBadge } from './create-validation-badge.js';
import { createFormularInput } from '../formular/atoms/create-formular-input.js';
import { createFormularDropdown } from '../formular/atoms/create-formular-dropdown.js';

export interface PropertySettingsModalProps {
  readonly property: Property;
  readonly entityStore: EntityStore;
  readonly storageProvider: IStorageProvider<Entity>;
}

export const createPropertySettingsModal = function(
  props: PropertySettingsModalProps
): VbsModal {
  const modal = document.createElement('vbs-modal') as VbsModal;
  modal.style.setProperty('--vbs-modal-width', '480px');

  let currentValidation = props.property.validation;

  // Header
  const header = document.createElement('vbs-modal-header');
  header.textContent = `Property: ${props.property.label}`;
  header.setAttribute('slot', 'header');

  // Body
  const body = document.createElement('div');
  body.className = 'flex flex-col gap-4 p-4';

  // Build form asynchronously
  const initializeForm = async () => {
    const schema = f.object({
      label: f.string().min(1, 'Label is required'),
      dataType: f.string(),
      componentType: f.string(),
    });

    const form = await createForm({ schema }) as unknown as IFormular<IObjectShape>;

    // Pre-fill form
    form.updateField('label', props.property.label);
    form.updateField('dataType', props.property.dataType);
    form.updateField('componentType', props.property.componentType);

    const cleanups: Array<() => void> = [];

    // Label field
    const labelField = createFormularInput({
      fieldName: 'label',
      form,
      label: 'Label',
      guide: 'Display name for this property',
    });
    body.appendChild(labelField.element);
    cleanups.push(labelField.cleanup.destroy);

    // Data Type dropdown
    const dataTypeField = createFormularDropdown({
      fieldName: 'dataType',
      form,
      label: 'Data Type',
      guide: 'Type of data stored',
      options: [
        { value: 'string', label: 'string' },
        { value: 'number', label: 'number' },
        { value: 'boolean', label: 'boolean' },
        { value: 'date', label: 'date' },
      ],
    });
    body.appendChild(dataTypeField.element);
    cleanups.push(dataTypeField.cleanup.destroy);

    // Component Type dropdown
    const componentTypeField = createFormularDropdown({
      fieldName: 'componentType',
      form,
      label: 'Component Type',
      guide: 'UI component for editing',
      options: [
        { value: 'input', label: 'input' },
        { value: 'textarea', label: 'textarea' },
        { value: 'checkbox', label: 'checkbox' },
        { value: 'select', label: 'select' },
        { value: 'date', label: 'date' },
      ],
    });
    body.appendChild(componentTypeField.element);
    cleanups.push(componentTypeField.cleanup.destroy);

    // Validation section
    const validationSection = document.createElement('div');
    validationSection.className = 'border-t border-gray-200 pt-4 mt-4';

    const validationHeader = document.createElement('div');
    validationHeader.className = 'flex items-center justify-between mb-2';

    const validationLabel = document.createElement('label');
    validationLabel.className = 'text-sm font-medium text-gray-700';
    validationLabel.textContent = 'Validation Rules';

    const validationBadge = createValidationBadge({
      ...(currentValidation !== undefined ? { validation: currentValidation } : {}),
      onClick: async () => {
        const data = form.getData();
        const validationModal = createValidationModal({
          propertyKey: props.property.key,
          dataType: data.dataType as DataType,
          ...(currentValidation !== undefined ? { currentValidation } : {}),
        });

        const result = await validationModal.open();
        if (result) {
          currentValidation = result;
          validationBadge.update(result);
        }
        validationModal.modal.remove();
      },
    });

    validationHeader.appendChild(validationLabel);
    validationHeader.appendChild(validationBadge.element);

    validationSection.appendChild(validationHeader);
    body.appendChild(validationSection);

    // Footer
    const footer = document.createElement('vbs-modal-footer');
    footer.setAttribute('slot', 'footer');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'ghost';
    cancelBtn.addEventListener('click', () => {
      cleanups.forEach(fn => fn());
      modal.close();
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.className = 'primary';
    saveBtn.addEventListener('click', async () => {
      const isValid = await form.validateForm();
      if (!isValid) {
        return;
      }

      const data = form.getData();

      // Create repository and update via proper abstraction
      const repository = createPropertyRepository({
        entityId: props.entityStore.signal.value.id,
        entitySignal: props.entityStore.signal,
        storageProvider: props.storageProvider
      });

      await repository.update(props.property.key, {
        label: String(data.label ?? props.property.label),
        dataType: String(data.dataType ?? props.property.dataType) as DataType,
        componentType: String(data.componentType ?? props.property.componentType) as any,
        ...(currentValidation !== undefined ? { validation: currentValidation } : {})
      });

      cleanups.forEach(fn => fn());
      modal.close();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    document.body.appendChild(modal);
  };

  // Initialize form when modal is opened
  initializeForm().catch(err => {
    console.error('Failed to initialize property settings modal:', err);
  });

  return modal;
};
