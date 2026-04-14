import type { IFormular, IObjectShape } from '@binaryjack/formular.dev'
import { f } from '@binaryjack/formular.dev'
import type { DataType, Property } from '@atomos-web/structura-core'
import { COMPONENT_TYPES, DATA_TYPES } from '@atomos-web/structura-core'
import { getCanvasAdapter } from '../../core/adapters/canvas-adapter.js'
import { createFormularManager } from '../../core/create-formular-manager.js'
import { selectEntityById, selectPropertyByKey } from '../../core/selectors.js'
import { createButton } from '@atomos-web/prime'
import { createFormularDropdown } from '@atomos-web/prime'
import { createFormularInput } from '@atomos-web/prime'
import { createValidationBadge } from './create-validation-badge.js'
import { createValidationModal } from './create-validation-modal.js'

import type { ModalOptions } from './types/modal-options.types.js'
import type { ModalResult } from './types/modal-result.types.js'
import type { AtpModal } from '@atomos-web/prime'

export interface PropertySettingsModalProps {
  readonly entityId: string;
  readonly propertyKey: string;
}

export const createPropertySettingsModal = function(
  props: PropertySettingsModalProps
): AtpModal {
  const initialProperty = selectPropertyByKey(props.entityId, props.propertyKey);
  if (!initialProperty) throw new Error(`Property ${props.propertyKey} not found`);

  const modal = document.createElement('atp-modal') as AtpModal;
  modal.style.setProperty('--atp-modal-width', '480px');

  let currentValidation = initialProperty.validation;
  let currentValue: unknown = initialProperty.value ?? '';
  let isInitialized = false;
  let currentForm: IFormular<IObjectShape> | null = null;
  let fieldCleanups: Array<() => void> = [];

  // Create FormularManager for this modal
  const formManager = createFormularManager();

  // Header
  const header = document.createElement('atp-modal-header');
  header.textContent = `Property: ${initialProperty.label}`;
  header.setAttribute('slot', 'header');

  // Body - initially empty, will be populated on first open
  const body = document.createElement('div');
  body.className = 'flex flex-col gap-4 p-4';

  // Footer - initially empty, will be populated on first open
  const footer = Object.assign(document.createElement('div'), { className: 'vbs-toolbar' });
  footer.setAttribute('slot', 'footer');

  // Set up modal structure immediately
  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);

  // Enhanced form initialization using FormularManager
  const initializeForm = async (preservedData?: any) => {
    console.log('[PROPERTY-MODAL] Initializing form with FormularManager, preserved data:', preservedData);
    
    try {
      const liveProperty = selectPropertyByKey(props.entityId, props.propertyKey);
      if (!liveProperty) throw new Error(`Property ${props.propertyKey} not found`);

      // Preserve value from live property unless user has already changed it
      if (!preservedData) currentValue = liveProperty.value ?? '';

      // Update header just in case label changed
      header.textContent = `Property: ${liveProperty.label}`;

      // Clear existing UI
      body.innerHTML = '';
      footer.innerHTML = '';
      fieldCleanups.forEach(fn => fn());
      fieldCleanups = [];

      const schema = f.object({
        label: f.string().optional(),
        dataType: f.string().optional(),
        componentType: f.string().optional(),
      });

      // Use FormularManager for safe form creation
      currentForm = await formManager.createFormForModal(modal, {
        schema,
        defaultValues: {
          label: preservedData?.label ?? liveProperty.label,
          dataType: preservedData?.dataType ?? liveProperty.dataType,
          componentType: preservedData?.componentType ?? liveProperty.componentType,
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
      options: DATA_TYPES.map(type => ({ value: type, label: type })),
    });
    body.appendChild(dataTypeField.element);
    fieldCleanups.push(dataTypeField.cleanup.destroy);

    // Component Type dropdown
    const componentTypeField = createFormularDropdown({
      fieldName: 'componentType',
      form,
      label: 'Component Type',
      guide: 'UI component for editing',
      options: COMPONENT_TYPES.map(type => ({ value: type, label: type })),
    });
    body.appendChild(componentTypeField.element);
    fieldCleanups.push(componentTypeField.cleanup.destroy);

    // ── Value field (adapts to componentType + dataType) ────────────────────
    const valueSectionWrap = document.createElement('div');
    valueSectionWrap.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

    const valueLabel = document.createElement('label');
    valueLabel.textContent = 'Value';
    valueLabel.style.cssText = 'font-size:12px;font-weight:600;color:var(--vbs-text-secondary, #a1a1aa);';

    const valueInputWrap = document.createElement('div');
    valueInputWrap.style.cssText = 'display:flex;align-items:center;';

    const sharedInputStyle = [
      'width:100%', 'box-sizing:border-box',
      'background:var(--vbs-bg-input, #09090b)', 'color:var(--vbs-text-primary, #f4f4f5)',
      'border:1px solid var(--vbs-border, #27272a)', 'border-radius: var(--vbs-radius, 2px)',
      'font-size:13px', 'padding:7px 10px', 'outline:none',
    ].join(';');

    let activeValueInput: HTMLElement | null = null;

    const buildValueInput = (): void => {
      // Read current values from the real native <select> elements already in the DOM.
      const ct = componentTypeField.element.querySelector<HTMLSelectElement>('select')?.value ?? 'input';
      const dt = dataTypeField.element.querySelector<HTMLSelectElement>('select')?.value ?? 'string';

      if (activeValueInput) valueInputWrap.removeChild(activeValueInput);

      if (ct === 'checkbox' || dt === 'boolean') {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(currentValue);
        cb.style.cssText = 'width:18px;height:18px;cursor:pointer;accent-color:var(--vbs-primary, #3b82f6);';
        cb.addEventListener('change', () => { currentValue = cb.checked; });
        activeValueInput = cb;
      } else if (ct === 'textarea') {
        const ta = document.createElement('textarea');
        ta.value = String(currentValue ?? '');
        ta.rows = 3;
        ta.style.cssText = sharedInputStyle + ';resize:vertical;';
        ta.addEventListener('input', () => { currentValue = ta.value; });
        activeValueInput = ta;
      } else {
        const inp = document.createElement('input');
        if (dt === 'number' || dt === 'integer' || dt === 'float') inp.type = 'number';
        else if (dt === 'date') inp.type = 'date';
        else inp.type = 'text';
        inp.value = String(currentValue ?? '');
        inp.placeholder = `Enter ${dt} value…`;
        inp.style.cssText = sharedInputStyle;
        inp.addEventListener('input', () => { currentValue = inp.value; });
        activeValueInput = inp;
      }
      valueInputWrap.appendChild(activeValueInput);
    };

    buildValueInput();

    // The real <select> nodes live inside the formular field elements — query them directly.
    const ctSelect  = componentTypeField.element.querySelector<HTMLSelectElement>('select');
    const dtSelect  = dataTypeField.element.querySelector<HTMLSelectElement>('select');
    const rebuildFn = () => buildValueInput();
    ctSelect?.addEventListener('change', rebuildFn);
    dtSelect?.addEventListener('change', rebuildFn);
    fieldCleanups.push(() => {
      ctSelect?.removeEventListener('change', rebuildFn);
      dtSelect?.removeEventListener('change', rebuildFn);
    });

    valueSectionWrap.appendChild(valueLabel);
    valueSectionWrap.appendChild(valueInputWrap);
    body.appendChild(valueSectionWrap);
    // ────────────────────────────────────────────────────────────────────────
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
    const cancelBtn = createButton({
      variant: 'ghost',
      size: 'md',
      children: 'Cancel',
      onClick: () => {
        // FormularManager will automatically clean up when modal closes
        fieldCleanups.forEach(fn => fn()); 
        modal.close();
      }
    });

    const saveBtn = createButton({
      variant: 'primary',
      size: 'md',
      children: 'Save',
      onClick: async () => {
        console.log('[PROPERTY-MODAL-DEBUG] Save clicked! Validating form...', { entityId: props.entityId, propertyKey: props.propertyKey });

        if (!currentForm) {
          console.warn('[PROPERTY-MODAL-DEBUG] No form available for validation');
          return;
        }

        let isValid = false;
        try {
          isValid = await currentForm.validateForm();
        } catch (err) {
          console.warn('[PROPERTY-MODAL-DEBUG] validateForm threw an error, trying to extract anyway:', err);
      }
      
      if (!isValid) {
        console.warn('[PROPERTY-MODAL-DEBUG] Form validation failed. Proceeding anyway by extracting what we have...');
      }

      let data: any = {};
      try {
        data = currentForm.getData() || {};
      } catch (err) {
        console.error('[PROPERTY-MODAL-DEBUG] Error getting form data:', err);
      }
      
      // FALLBACK: Manually extract directly from the registered fields
      // Formular.getData() can sometimes drop fields if they aren't fully validated or pristine.
      try {
        const manualLabel = (currentForm.getField('label')?.input as any)?.value;
        const manualDataType = (currentForm.getField('dataType')?.input as any)?.value;
        const manualComponentType = (currentForm.getField('componentType')?.input as any)?.value;
        
        if (manualLabel !== undefined) data.label = manualLabel;
        if (manualDataType !== undefined) data.dataType = manualDataType;
        if (manualComponentType !== undefined) data.componentType = manualComponentType;
      } catch (err) {
        console.warn('[PROPERTY-MODAL-DEBUG] Manual extraction failed:', err);
      }

      console.log('[PROPERTY-MODAL-DEBUG] Final form data retrieved:', data);

      // Update via Clean Architecture Adapter
      const entityToUpdate = selectEntityById(props.entityId);
      console.log('[PROPERTY-MODAL-DEBUG] Entity to update found?', !!entityToUpdate, entityToUpdate);
      
      if (entityToUpdate) {
        const liveProperty = entityToUpdate.properties.find((p: any) => p.key === props.propertyKey);
        console.log('[PROPERTY-MODAL-DEBUG] Live property found?', !!liveProperty, liveProperty);
        
        if (!liveProperty) {
          console.warn('[PROPERTY-MODAL-DEBUG] Aborting. liveProperty not found for key:', props.propertyKey);
          return;
        }

        const newProperties = entityToUpdate.properties.map((p: any) =>
          p.key === props.propertyKey ? {
            ...p,
            label: String(data.label ?? liveProperty.label),
            dataType: String(data.dataType ?? liveProperty.dataType) as DataType,
            componentType: String(data.componentType ?? liveProperty.componentType) as any,
            value: currentValue,
            ...(currentValidation !== undefined ? { validation: currentValidation } : {})
          } : p
        );

        console.log('[PROPERTY-MODAL-DEBUG] Dispatching updateEntityProperties to Clean Architecture. New props:', newProperties);
        getCanvasAdapter().updateEntityProperties(props.entityId, newProperties as Property[]);
      } else {
        console.warn('[PROPERTY-MODAL-DEBUG] Aborting. entityToUpdate not found for id:', props.entityId);
      }

      // Clean up before closing
      fieldCleanups.forEach(fn => fn());
      formManager.cleanupModal(modal);
      modal.close();
    }
    });

    footer.appendChild(cancelBtn.element);
    footer.appendChild(saveBtn.element);
    
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
  modal.close = function(result?: any) {
    console.log('[PROPERTY-MODAL] Closing modal - cleaning up with FormularManager');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    fieldCleanups.forEach(fn => fn());
    fieldCleanups = [];
    formManager.cleanupModal(modal);
    currentForm = null;
    return originalClose(result);
  };

  // Ensure DOM is completely clean after animation finishes
  modal.addEventListener('atp-modal-closed', () => {
    if (modal.parentElement) {
      modal.parentElement.removeChild(modal);
    }
  });

  return modal;
};

