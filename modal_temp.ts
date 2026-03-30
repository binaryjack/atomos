import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { f } from '@binaryjack/formular.dev'
import type { DataType, Property } from '@vbs/vbs-mod'
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js'
import { getGlobalReduxStore } from '../../core/create-redux-store.js'
import { selectEntityById, selectPropertyByKey } from '../../core/selectors.js'
import { createFormularManager } from '../../core/create-formular-manager.js'
import { createFormularDropdown } from '../formular/atoms/create-formular-dropdown.js'
import { createFormularInput } from '../formular/atoms/create-formular-input.js'
import { createValidationBadge } from './create-validation-badge.js'
import { createValidationModal } from './create-validation-modal.js'
import './index.js'
import type { ModalOptions } from './types/modal-options.types.js'
import type { ModalResult } from './types/modal-result.types.js'
import type { VbsModal } from './vbs-modal.js'

export interface PropertySettingsModalProps {
  readonly entityId: string;
  readonly propertyKey: string;
}

export const createPropertySettingsModal = function(
  props: PropertySettingsModalProps
): VbsModal {
  const property = selectPropertyByKey(props.entityId, props.propertyKey);
  if (!property) throw new Error(`Property ${props.propertyKey} not found`);

  const modal = document.createElement('vbs-modal') as VbsModal;
  modal.style.setProperty('--vbs-modal-width', '480px');

  let currentValidation = property.validation;
  let isInitialized = false;
  let currentForm: IFormular<IObjectShape> | null = null;
  let fieldCleanups: Array<() => void> = [];

  // Create FormularManager for this modal
  const formManager = createFormularManager();

  // Header
  const header = document.createElement('vbs-modal-header');
  header.textContent = `Property: ${property.label}`;
  header.setAttribute('slot', 'header');

  // Body - initially empty, will be populated on first open
  const body = document.createElement('div');
  body.className = 'flex flex-col gap-4 p-4';

  // Footer - initially empty, will be populated on first open
  const footer = document.createElement('vbs-modal-footer');
  footer.setAttribute('slot', 'footer');

  // Set up modal structure immediately
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  // Enhanced form initialization using FormularManager
  const initializeForm = async (preservedData?: any) => {
    console.log('[PROPERTY-MODAL] Initializing form with FormularManager, preserved data:', preservedData);
    
    try {
      // Clear existing UI
      body.innerHTML = '';
      footer.innerHTML = '';
      fieldCleanups.forEach(fn => fn());
      fieldCleanups = [];

      const schema = f.object({
        label: f.string().min(1, 'Label is required'),
        dataType: f.string(),
        componentType: f.string(),
      });

      // Use FormularManager for safe form creation
      currentForm = await formManager.createFormForModal(modal, {
        schema,
        defaultValues: {
          label: preservedData?.label ?? property.label,
          dataType: preservedData?.dataType ?? property.dataType,
          componentType: preservedData?.componentType ?? property.componentType,
        }
      }) as unknown as IFormular<IObjectShape>;

      // Create form fields
      if (currentForm) {
        await createFormFields(currentForm);
      }
      
    } catch (error) {
      console.error('[PROPERTY-MODAL] Error initializing form:', error);
      throw error;
    }
  };

  // Shared form fields creation logic
  const createFormFields = async (form: IFormular<IObjectShape>) => {

    // Label field
    const labelField = createFormularInput({
      fieldName: 'label',
      form,
      label: 'Label',
      guide: 'Display name for this property',
    });
    body.appendChild(labelField.element);
    fieldCleanups.push(labelField.cleanup.destroy);

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
    fieldCleanups.push(dataTypeField.cleanup.destroy);

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
    fieldCleanups.push(componentTypeField.cleanup.destroy);

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
        console.log('[PROPERTY-MODAL] Opening validation modal with FormularManager...');
        
        // Get current form data before opening validation modal
        const currentData = form.getData();
        
        // Clear form UI temporarily with loading message
        body.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Opening validation settings...</div>';
        
        try {
          const validationModal = createValidationModal({
            propertyKey: props.propertyKey,
            dataType: currentData.dataType as DataType,
            ...(currentValidation !== undefined ? { currentValidation } : {}),
          });

          const result = await validationModal.open();
          if (result) {
            currentValidation = result;
          }
          validationModal.modal.remove();
          
          // Recreate the form with preserved data + new validation
          console.log('[PROPERTY-MODAL] Validation modal closed - recreating form with FormularManager...');
          await initializeForm(currentData);
          
        } catch (error) {
          console.error('[PROPERTY-MODAL] Error in validation modal:', error);
          // Recreate form even if validation failed
          await initializeForm(currentData);
        }
      },
    });

    validationHeader.appendChild(validationLabel);
    validationHeader.appendChild(validationBadge.element);
    
    // Add validation badge cleanup to the field cleanups
    fieldCleanups.push(validationBadge.cleanup.destroy);

    validationSection.appendChild(validationHeader);
    body.appendChild(validationSection);

    // Create footer buttons
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'ghost';
    cancelBtn.addEventListener('click', () => {
      // FormularManager will automatically clean up when modal closes
      fieldCleanups.forEach(fn => fn()); 
      modal.close();
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.className = 'primary';
    saveBtn.addEventListener('click', async () => {
      if (!currentForm) {
        console.warn('[PROPERTY-MODAL] No form available for validation');
        return;
      }

      const isValid = await currentForm.validateForm();
      if (!isValid) {
        return;
      }

      const data = currentForm.getData();

      // Update via Redux
      const entityToUpdate = selectEntityById(props.entityId);
      if (entityToUpdate) {
        const newProperties = entityToUpdate.properties.map((p: any) => 
          p.key === props.propertyKey ? { 
            ...p, 
            label: String(data.label ?? property.label),
            dataType: String(data.dataType ?? property.dataType) as DataType, 
            componentType: String(data.componentType ?? property.componentType) as any,
            ...(currentValidation !== undefined ? { validation: currentValidation } : {}) 
          } : p
        );

        getGlobalReduxStore().dispatch({
          type: 'entity-updated',
          schema_id: 'schema-default',
          entity: { ...entityToUpdate, properties: newProperties }
        });
      }

      // Clean up before closing
      fieldCleanups.forEach(fn => fn());
      formManager.cleanupModal(modal);
      modal.close();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    
    console.log('[PROPERTY-MODAL] ✓ Form fields created successfully with FormularManager');
  };

  // Override modal's open method to implement lazy initialization
  const originalOpen = modal.open.bind(modal);
  modal.open = async function<T = void>(options?: ModalOptions<T>): Promise<ModalResult<T>> {
    if (!isInitialized) {
      console.log('[PROPERTY-MODAL] First open - initializing form with FormularManager...');
      try {
        await initializeForm();
        isInitialized = true;
      } catch (error) {
        console.error('[PROPERTY-MODAL] Failed to initialize form:', error);
        // Show error in modal body
        body.innerHTML = `
          <div style="color: #ef4444; padding: 20px; text-align: center;">
            <p>Failed to initialize form</p>
            <p style="font-size: 12px; opacity: 0.7;">${error instanceof Error ? error.message : String(error)}</p>
          </div>
        `;
      }
    }
    
    // Add modal to DOM if not already present
    if (!modal.parentElement) {
      document.body.appendChild(modal);
    }
    
    return originalOpen(options);
  };

  // Override modal's close method to ensure proper cleanup
  const originalClose = modal.close.bind(modal);
  modal.close = function() {
    console.log('[PROPERTY-MODAL] Closing modal - cleaning up with FormularManager');
    fieldCleanups.forEach(fn => fn());
    fieldCleanups = [];
    formManager.cleanupModal(modal);
    currentForm = null;
    return originalClose();
  };

  return modal;
};
