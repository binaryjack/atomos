import type { InputDataTypes } from '@binaryjack/formular.dev';
import { EventsEnum, newEvent } from '@binaryjack/formular.dev';
import { createInput } from '../../input/create-input.js';
import type { FormularAtomProps, FormularAtomResult } from '../types/formular-atom.types.js';
import '../vbs-field-set.js';
import '../vbs-validation-result.js';
import type { VbsValidationResult } from '../vbs-validation-result.js';

export interface FormularInputProps extends FormularAtomProps {
  readonly placeholder?: string;
  readonly type?: 'text' | 'number' | 'email' | 'password' | 'color';
}

export const createFormularInput = function(props: FormularInputProps): FormularAtomResult {
  const { fieldName, form, label, guide, placeholder, type = 'text' } = props;
  const cleanups: Array<() => void> = [];

  // Forward-ref: assigned before any DOM event can fire
  let validation!: VbsValidationResult;

  const inputResult = createInput({
    type,
    id: fieldName,
    ...(placeholder !== undefined ? { placeholder } : {}),
    onChange: (value) => form.updateField(fieldName, value as InputDataTypes),
    onFocus: () => validation.setFocused(true),
    onBlur: () => {
      const fld = form.getField(fieldName);
      const afterValidate = () => validation.setFocused(false);
      if (fld) {
        (fld.input as unknown as { handleValidationAsync: (e: unknown) => Promise<unknown[]> })
          .handleValidationAsync(newEvent(fieldName, 'vbs', EventsEnum.onBlur, 'blur', fieldName, fld))
          .then(afterValidate)
          .catch(afterValidate);
      } else {
        afterValidate();
      }
    },
  });
  inputResult.element.slot = 'input';
  inputResult.element.style.cssText = [
    'width:100%',
    'box-sizing:border-box',
    type === 'color' ? 'padding:2px; height:38px; cursor:pointer;' : 'padding:8px 12px;',
    'background:#1e293b',
    'border:1px solid #334155',
    'border-radius:6px',
    'color:#f1f5f9',
    'font-size:14px',
    'outline:none',
    'transition:border-color 0.15s',
  ].join(';');
  cleanups.push(() => inputResult.cleanup.destroy());

  const fieldObj = form.getField(fieldName);
  if (fieldObj) {
    const val = (fieldObj.input as unknown as { value: InputDataTypes }).value;
    if (val != null) inputResult.element.value = String(val);
  }

  validation = document.createElement('vbs-validation-result') as VbsValidationResult;
  validation.slot = 'validation';
  validation.form = form;
  validation.fieldName = fieldName;
  if (guide) validation.guideText = guide;

  const fieldSet = document.createElement('vbs-field-set');
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.slot = 'label';
    labelEl.htmlFor = fieldName;
    labelEl.textContent = label;
    fieldSet.appendChild(labelEl);
  }
  fieldSet.appendChild(inputResult.element);
  fieldSet.appendChild(validation);

  return {
    element: fieldSet,
    refresh: () => validation.refresh(),
    cleanup: { destroy: () => cleanups.forEach(fn => fn()) },
  };
};
