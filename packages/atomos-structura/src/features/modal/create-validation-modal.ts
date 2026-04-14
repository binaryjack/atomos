import type { IFormular, IObjectShape, IValidationOptions } from '@binaryjack/formular.dev';
import { createForm, f } from '@binaryjack/formular.dev';
import type { DataType } from '@atomos-web/structura-core';
import { createButton } from '@atomos-web/prime';
import { createFormularCheckbox } from '@atomos-web/prime';
import { createFormularInput } from '@atomos-web/prime';

import type { AtpModal } from '@atomos-web/prime';

export interface ValidationModalProps {
  readonly propertyKey: string;
  readonly dataType: DataType;
  readonly currentValidation?: IValidationOptions;
}

export interface ValidationModalResult {
  readonly modal: AtpModal;
  readonly open: () => Promise<IValidationOptions | null>;
}

export const createValidationModal = function(
  props: ValidationModalProps
): ValidationModalResult {
  const modal = document.createElement('atp-modal') as AtpModal;
  modal.style.setProperty('--atp-modal-width', '520px');

  const open = async (): Promise<IValidationOptions | null> => {
    // Clear modal
    modal.innerHTML = '';

    // Header
    const header = document.createElement('atp-modal-header');
    header.textContent = `Validation: ${props.propertyKey}`;
    header.setAttribute('slot', 'header');

    // Body container
    const body = document.createElement('div');
    body.className = 'flex flex-col gap-4 p-4';
    // Build schema based on dataType
    let schema;
    if (props.dataType === 'string') {
      schema = f.object({
        required: f.boolean(),
        minLength: f.number().int().optional(),
        maxLength: f.number().int().optional(),
        pattern: f.string().optional(),
      });
    } else if (props.dataType === 'number' || props.dataType === 'integer' || props.dataType === 'float') {
      schema = f.object({
        required: f.boolean(),
        min: f.number().optional(),
        max: f.number().optional(),
      });
    } else if (props.dataType === 'date') {
      schema = f.object({
        required: f.boolean(),
        min: f.string().optional(),
        max: f.string().optional(),
      });
    } else {
      schema = f.object({
        required: f.boolean(),
      });
    }

    const form = await createForm({ schema }) as unknown as IFormular<IObjectShape>;

    // Pre-fill form with current validation
    const current = props.currentValidation ?? {};
    form.updateField('required', current.required?.value ?? false);

    if (props.dataType === 'string') {
      if (current.minLength) form.updateField('minLength', current.minLength.value);
      if (current.maxLength) form.updateField('maxLength', current.maxLength.value);
      if (current.pattern) form.updateField('pattern', String((current.pattern as any).value));
    } else if (props.dataType === 'number' || props.dataType === 'integer' || props.dataType === 'float') {
      if (current.min) form.updateField('min', current.min.value);
      if (current.max) form.updateField('max', current.max.value);
    } else if (props.dataType === 'date') {
      if (current.min) {
        const minVal = current.min.value;
        form.updateField('min', typeof minVal === 'number' ? new Date(minVal).toISOString().split('T')[0] : String(minVal));
      }
      if (current.max) {
        const maxVal = current.max.value;
        form.updateField('max', typeof maxVal === 'number' ? new Date(maxVal).toISOString().split('T')[0] : String(maxVal));
      }
    }

    // Build form fields
    const cleanups: Array<() => void> = [];

    const requiredField = createFormularCheckbox({
      fieldName: 'required',
      form,
      label: 'Required',
      guide: 'Make this field mandatory',
      checkLabel: 'This field is required',
    });
    body.appendChild(requiredField.element);
    cleanups.push(requiredField.cleanup.destroy);

    if (props.dataType === 'string') {
      const minLengthField = createFormularInput({
        fieldName: 'minLength',
        form,
        label: 'Minimum Length',
        guide: 'Minimum number of characters',
        type: 'number',
      });
      body.appendChild(minLengthField.element);
      cleanups.push(minLengthField.cleanup.destroy);

      const maxLengthField = createFormularInput({
        fieldName: 'maxLength',
        form,
        label: 'Maximum Length',
        guide: 'Maximum number of characters',
        type: 'number',
      });
      body.appendChild(maxLengthField.element);
      cleanups.push(maxLengthField.cleanup.destroy);

      const patternField = createFormularInput({
        fieldName: 'pattern',
        form,
        label: 'Pattern (Regex)',
        guide: 'Regular expression for validation',
        placeholder: '[A-Z0-9]+',
      });
      body.appendChild(patternField.element);
      cleanups.push(patternField.cleanup.destroy);
    } else if (props.dataType === 'number' || props.dataType === 'integer' || props.dataType === 'float') {
      const minField = createFormularInput({
        fieldName: 'min',
        form,
        label: 'Minimum Value',
        guide: 'Minimum allowed value',
        type: 'number',
      });
      body.appendChild(minField.element);
      cleanups.push(minField.cleanup.destroy);

      const maxField = createFormularInput({
        fieldName: 'max',
        form,
        label: 'Maximum Value',
        guide: 'Maximum allowed value',
        type: 'number',
      });
      body.appendChild(maxField.element);
      cleanups.push(maxField.cleanup.destroy);
    } else if (props.dataType === 'date') {
      const minField = createFormularInput({
        fieldName: 'min',
        form,
        label: 'Minimum Date',
        guide: 'Earliest allowed date (YYYY-MM-DD)',
        placeholder: '2024-01-01',
      });
      body.appendChild(minField.element);
      cleanups.push(minField.cleanup.destroy);

      const maxField = createFormularInput({
        fieldName: 'max',
        form,
        label: 'Maximum Date',
        guide: 'Latest allowed date (YYYY-MM-DD)',
        placeholder: '2024-12-31',
      });
      body.appendChild(maxField.element);
      cleanups.push(maxField.cleanup.destroy);
    }

    // Footer
    const footer = Object.assign(document.createElement('div'), { className: 'vbs-toolbar' });
    footer.setAttribute('slot', 'footer');

    // Wire up buttons definitions
    const cancelHandler = () => {
      cleanups.forEach(fn => fn());
      modal.close();
    };

    const saveHandler = async () => {
      let isValid = false;
      try {
        isValid = await form.validateForm();
      } catch (err) {
        console.warn('[VALIDATION-MODAL] validateForm threw an error, trying to extract anyway:', err);
      }

      if (!isValid) {
        console.warn('[VALIDATION-MODAL] Form validation failed, proceeding with extracted data...');
      }

      let data: any = {};
      try {
        data = form.getData() || {};
      } catch (err) {
        console.warn('[VALIDATION-MODAL] form.getData() threw:', err);
      }
      
      // Fallback: manually extract
      try {
        // Safe manual extraction by field
        const extract = (field: string) => {
           const val = (form.getField(field)?.input as any)?.value;
           if (val !== undefined && val !== null) data[field] = val;
        };
        extract('required');
        extract('minLength');
        extract('maxLength');
        extract('pattern');
        extract('min');
        extract('max');
      } catch(err) {
        console.warn('[VALIDATION-MODAL] Manual extraction failed:', err);
      }
      const validation: IValidationOptions = {};

      if (data.required === true) {
        validation.required = { value: true };
      }

      if (props.dataType === 'string') {
        if (data.minLength != null && data.minLength !== '') {
          validation.minLength = { value: Number(data.minLength) };
        }
        if (data.maxLength != null && data.maxLength !== '') {
          validation.maxLength = { value: Number(data.maxLength) };
        }
        if (data.pattern && data.pattern.trim() !== '') {
          try {
            validation.pattern = { value: new RegExp(data.pattern) };
          } catch {
            // Invalid regex - skip
          }
        }
      } else if (props.dataType === 'number' || props.dataType === 'integer' || props.dataType === 'float') {
        if (data.min != null && data.min !== '') {
          validation.min = { value: Number(data.min) };
        }
        if (data.max != null && data.max !== '') {
          validation.max = { value: Number(data.max) };
        }
      } else if (props.dataType === 'date') {
        if (data.min && data.min.trim() !== '') {
          validation.min = { value: new Date(data.min).getTime() };
        }
        if (data.max && data.max.trim() !== '') {
          validation.max = { value: new Date(data.max).getTime() };
        }
      }

      cleanups.forEach(fn => fn());
      modal.close(validation);
    };

    const cancelBtn = createButton({
      variant: 'ghost',
      size: 'md',
      children: 'Cancel',
      onClick: cancelHandler
    });

    const saveBtn = createButton({
      variant: 'primary',
      size: 'md',
      children: 'Save Validation',
      onClick: saveHandler
    });

    footer.appendChild(cancelBtn.element);
    footer.appendChild(saveBtn.element);

    // Append to modal
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    document.body.appendChild(modal);

    const result = await modal.open<IValidationOptions>();
    
    if (result.cancelled) {
      return null;
    }
    return result.value as IValidationOptions;
  };

  return { modal, open };
};
